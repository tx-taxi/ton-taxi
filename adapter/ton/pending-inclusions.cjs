"use strict";

const { Address, Cell, beginCell, loadMessage, loadTransaction, storeMessage } = require("@ton/core");
const { LiteClient } = require("ton-lite-client");
const { ADNLClientTCP } = require("adnl");
const { TLReadBuffer, TLWriteBuffer } = require("ton-tl");
const { Codecs, Functions } = require("ton-lite-client/dist/schema");
const { randomBytes } = require("node:crypto");
const { parseExact } = require("./provider.cjs");

const SOURCE = "https://tonapi.io/v2/sse/accounts/transactions?accounts=ALL";
const CONFIG = "https://ton.org/global.config.json";
const MAX_BYTES = 1024 * 1024;
const DEADLINE_MS = 8000;
const IDLE_MS = 20000;
const MAX_WORKERS = 4;

function transactionEvent(value, receivedAt = Date.now()) {
  if (!value || typeof value.account_id !== "string" || typeof value.tx_hash !== "string"
      || !/^[a-f0-9]{64}$/i.test(value.tx_hash)) throw new Error("Invalid inclusion event");
  const address = Address.parse(value.account_id);
  if (typeof value.lt === "number" && !Number.isSafeInteger(value.lt)) throw new Error("Unsafe inclusion logical time");
  const lt = String(value.lt);
  if (!/^\d{1,20}$/.test(lt) || BigInt(lt) < 1n || BigInt(lt) > 0xffffffffffffffffn)
    throw new Error("Invalid inclusion logical time");
  return { destination: address.toRawString(), lt, transactionHash: value.tx_hash.toLowerCase(), receivedAt };
}

// A finalized-account notification is only a lookup cursor. The returned BOC
// must match that exact transaction before its external input can remove a row.
function verifyTransaction(response, event) {
  if (!Buffer.isBuffer(response?.transactions) || !response.transactions.length
      || response.transactions.length > MAX_BYTES) throw new Error("Invalid transaction BOC size");
  const roots = Cell.fromBoc(response.transactions);
  if (roots.length !== 1 || roots[0].hash().toString("hex") !== event.transactionHash)
    throw new Error("Transaction BOC does not match inclusion hash");
  const tx = loadTransaction(roots[0].beginParse());
  const account = Address.parse(event.destination);
  if (tx.address !== BigInt("0x" + account.hash.toString("hex")) || tx.lt.toString() !== event.lt
      || !Array.isArray(response.ids) || response.ids.length !== 1
      || response.ids[0].workchain !== account.workChain)
    throw new Error("Transaction BOC does not match inclusion account or logical time");
  if (!Number.isSafeInteger(tx.now) || tx.now <= 0) throw new Error("Invalid transaction timestamp");
  const slice = roots[0].beginParse();
  slice.skip(4 + 256 + 64 + 256 + 64 + 32 + 15 + 2 + 2);
  const messages = slice.loadRef().beginParse();
  if (!messages.loadBit()) return null;
  const inbound = messages.loadRef();
  const message = loadMessage(inbound.beginParse());
  if (message.info.type !== "external-in") return null;
  if (!message.info.dest.equals(account)) throw new Error("External input destination mismatch");
  const normalized = beginCell().store(storeMessage({
    info: { type: "external-in", dest: message.info.dest, importFee: 0n },
    body: message.body,
  }, { forceRef: true })).endCell();
  return {
    hash: inbound.hash().toString("hex"), normalizedHash: normalized.hash().toString("hex"),
    destination: account.toRawString(), bodyHash: message.body.hash().toString("hex"),
    // Chain time is second-granular; include that whole second in correlation.
    at: new Date(tx.now * 1000 + 999).toISOString(), transactionHash: event.transactionHash,
  };
}

// LiteSingleEngine's error path schedules an unconditional reconnect after
// close(). Own the small engine lifecycle so shutdown cancels every retry and
// rejects in-flight reads, while LiteClient still supplies the official RPC.
class InclusionLiteEngine {
  constructor(host, publicKey) {
    Object.assign(this, { host, publicKey, closed: false, ready: false, queries: new Map() });
    this.connect();
  }
  isReady() { return this.ready && !this.closed; }
  isClosed() { return this.closed; }
  connect() {
    if (this.closed) return;
    const client = new ADNLClientTCP(this.host, this.publicKey);
    this.connection = client;
    const fail = () => {
      if (this.connection !== client) return;
      this.connection = null;
      this.ready = false;
      clearTimeout(this.connectTimer);
      client.socket.destroy();
      for (const query of this.queries.values()) query.finish(new Error("Lite connection unavailable"));
      if (!this.closed) this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
    client.on("error", fail);
    client.on("close", fail);
    client.on("ready", () => {
      if (this.connection !== client || this.closed) { client.socket.destroy(); return; }
      clearTimeout(this.connectTimer);
      this.ready = true;
    });
    client.on("data", data => {
      if (this.connection !== client || this.closed) return;
      try {
        if (data.length > MAX_BYTES + 4096) throw new Error("Lite response too large");
        const answer = Codecs.adnl_Message.decode(new TLReadBuffer(data));
        if (answer.kind !== "adnl.message.answer") return;
        const query = this.queries.get(answer.queryId.toString("hex"));
        if (!query) return;
        if (answer.answer.readInt32LE(0) === -1146494648) {
          const error = Codecs.liteServer_Error.decode(new TLReadBuffer(answer.answer));
          query.finish(new Error(String(error.message || "Lite query unavailable").slice(0, 180)));
        }
        else query.finish(null, query.f.decodeResponse(new TLReadBuffer(answer.answer)));
      } catch { fail(); }
    });
    this.connectTimer = setTimeout(fail, DEADLINE_MS);
    // ADNL's key generation is asynchronous; a stop during it must also
    // destroy the socket after connect() finishes.
    client.connect().then(() => {
      if (this.closed || this.connection !== client) client.socket.destroy();
    }).catch(fail);
  }
  query(f, request, { timeout = 2500 } = {}) {
    if (!this.isReady()) return Promise.reject(new Error("Lite connection is not ready"));
    const id = randomBytes(32);
    const idHex = id.toString("hex");
    const writer = new TLWriteBuffer();
    f.encodeRequest(request, writer);
    const ls = new TLWriteBuffer();
    Functions.liteServer_query.encodeRequest({ kind: "liteServer.query", data: writer.build() }, ls);
    const adnl = new TLWriteBuffer();
    Codecs.adnl_Message.encode({ kind: "adnl.message.query", queryId: id, query: ls.build() }, adnl);
    return new Promise((resolve, reject) => {
      const query = { f, timer: null, finish: (error, value) => {
        clearTimeout(query.timer);
        this.queries.delete(idHex);
        error ? reject(error) : resolve(value);
      } };
      query.timer = setTimeout(() => query.finish(new Error("Lite query timed out")), Math.min(2500, timeout));
      this.queries.set(idHex, query);
      try { this.connection.write(adnl.build()); } catch { query.finish(new Error("Lite write failed")); }
    });
  }
  close() {
    this.closed = true;
    this.ready = false;
    clearTimeout(this.connectTimer);
    clearTimeout(this.reconnectTimer);
    const connection = this.connection;
    this.connection = null;
    connection?.socket.destroy();
    for (const query of this.queries.values()) query.finish(new Error("Lite engine stopped"));
  }
}

function createLiteClient(server) {
  const ip = Number(server.ip) >>> 0;
  const host = `tcp://${ip >>> 24}.${(ip >>> 16) & 255}.${(ip >>> 8) & 255}.${ip & 255}:${server.port}`;
  const engine = new InclusionLiteEngine(host, Buffer.from(server.id.key, "base64"));
  return { engine, client: new LiteClient({ engine }) };
}

class PendingInclusions {
  constructor({ key = "", shouldTrack = () => false, onConfirm = () => {}, onStatus = () => {},
    fetchImpl = fetch, clientFactory = createLiteClient } = {}) {
    this.key = typeof key === "string" ? key.trim() : "";
    Object.assign(this, { shouldTrack, onConfirm, onStatus, fetch: fetchImpl, clientFactory });
    this.running = false;
    this.connected = false;
    this.state = this.key ? "loading" : "unavailable";
    this.queue = new Map();
    this.active = new Map();
    this.completed = new Map();
    this.pool = [];
    this.configServers = [];
    this.serverCooldowns = new Map();
    this.nextServer = 0;
    this.serverRotations = 0;
    this.controllers = new Set();
    this.waits = new Set();
    this.generation = 0;
    this.hydratedGeneration = -1;
    this.connections = 0;
    this.reconnects = 0;
    this.events = 0;
    this.matchedEvents = 0;
    this.requests = 0;
    this.verified = 0;
    this.healthChecks = 0;
    this.confirmations = 0;
    this.failures = 0;
    this.dropped = 0;
    this.lastMessageAt = null;
    this.lastHydrationAt = null;
    this.lastRpcAt = null;
    this.lastGapAt = null;
    this.coverageRecoveredAt = null;
    this.lastError = this.key ? null : "TonAPI pending credential unavailable";
    this.lastLiteError = null;
    this.expiredCursors = 0;
    this.liteTimeouts = 0;
    this.liteQueryErrors = 0;
    this.liteConnectionFailures = 0;
  }

  health() {
    return { state: this.state, running: this.running, streamConnected: this.connected,
      queue: this.queue.size, inFlight: this.active.size, liteConnections: this.pool.length,
      connections: this.connections, reconnects: this.reconnects, events: this.events,
      matchedEvents: this.matchedEvents, requests: this.requests, verified: this.verified,
      healthChecks: this.healthChecks, lastRpcAt: this.lastRpcAt,
      expiredCursors: this.expiredCursors, lastLiteError: this.lastLiteError,
      serverRotations: this.serverRotations,
      liteTimeouts: this.liteTimeouts, liteQueryErrors: this.liteQueryErrors, liteConnectionFailures: this.liteConnectionFailures,
      liteServers: this.pool.map(server => ({ configIndex: server.configIndex, ready: server.engine.isReady(),
        inFlight: server.inFlight, consecutiveFailures: server.failures,
        coolingDown: (server.failedUntil || 0) > Date.now(), retiring: !!server.retireRequested })),
      confirmations: this.confirmations, failures: this.failures, dropped: this.dropped,
      lastMessageAt: this.lastMessageAt, lastHydrationAt: this.lastHydrationAt,
      lastGapAt: this.lastGapAt, coverageRecoveredAt: this.coverageRecoveredAt, lastError: this.lastError };
  }

  publish() {
    const previous = this.state;
    this.state = !this.key ? "unavailable" : this.connected && this.hydratedGeneration === this.generation
      ? "live" : this.lastGapAt ? "stale" : "loading";
    if (this.state === "live" && previous !== "live") this.coverageRecoveredAt = new Date().toISOString();
    this.onStatus(this.health());
  }

  gap(message) {
    this.generation++;
    this.lastGapAt = new Date().toISOString();
    this.lastError = this.key ? String(message).replaceAll(this.key, "[redacted]").slice(0, 180) : String(message).slice(0, 180);
    this.publish();
    if (this.connected && this.running) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = setTimeout(() => this.requestHealth(), 3000);
    }
  }

  requestHealth() {
    if (!this.running || !this.connected || this.hydratedGeneration === this.generation) return;
    this.healthNeeded = true;
    this.pump();
  }

  wait(ms) {
    return new Promise(resolve => {
      const entry = { timer: null, finish: () => { clearTimeout(entry.timer); this.waits.delete(entry); resolve(); } };
      entry.timer = setTimeout(entry.finish, ms);
      this.waits.add(entry);
    });
  }

  async loadPool() {
    if (this.pool.length) return;
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), DEADLINE_MS);
    try {
      const response = await this.fetch(CONFIG, { signal: controller.signal, redirect: "error" });
      if (!response.ok || !response.body) throw new Error("Official lite-server config unavailable");
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (this.running) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new Error("Official lite-server config too large"); }
        chunks.push(Buffer.from(next.value));
      }
      if (!this.running) return;
      const config = parseExact(Buffer.concat(chunks).toString("utf8"));
      const servers = config.liteservers?.filter(server => Number.isSafeInteger(Number(server.ip))
        && Number.isInteger(Number(server.port)) && Number(server.port) > 0 && Number(server.port) < 65536
        && typeof server.id?.key === "string" && Buffer.from(server.id.key, "base64").length === 32).slice(0, 64);
      if (!servers?.length) throw new Error("Official config has no valid lite servers");
      this.configServers = servers;
      // Block economics uses the first three official servers. Start pending
      // reads on another slice so neither workload competes for those slots.
      this.nextServer = servers.length > 3 ? 3 : 0;
      for (let i = 0; i < Math.min(3, servers.length); i++) this.pool.push(this.newServer());
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
    }
  }

  newServer() {
    const active = new Set(this.pool.map(server => server.configIndex));
    for (let i = 0; i < this.configServers.length; i++) {
      const configIndex = this.nextServer++ % this.configServers.length;
      if (active.has(configIndex) || (this.serverCooldowns.get(configIndex) || 0) > Date.now()) continue;
      return { ...this.clientFactory(this.configServers[configIndex]), configIndex, inFlight: 0, failures: 0,
        latency: 500, failedUntil: 0, retireRequested: false, retired: false };
    }
    return null;
  }

  retireServer(server) {
    if (!this.running || server.inFlight || server.retired) return;
    const index = this.pool.indexOf(server);
    if (index < 0) return;
    // Build only after closing the old connection: at most three sockets,
    // including replacement handshakes. Other workers never lose a live query.
    const available = this.configServers.some((_, configIndex) =>
      !this.pool.some(slot => slot.configIndex === configIndex)
      && (this.serverCooldowns.get(configIndex) || 0) <= Date.now());
    if (!available) { server.retireRequested = false; server.failedUntil = Date.now() + 1000; return; }
    this.serverCooldowns.set(server.configIndex, Date.now() + 60000);
    server.retired = true;
    server.engine.close();
    const replacement = this.newServer();
    this.pool[index] = replacement;
    this.serverRotations++;
  }

  serverFailed(server, error) {
    if (!this.running || server.retired) return;
    server.failures++;
    server.failedUntil = Date.now() + 250;
    this.lastLiteError = String(error?.message || "Lite read failed").slice(0, 180);
    if (/timed out/i.test(this.lastLiteError)) this.liteTimeouts++;
    else if (/connection (not ready|unavailable)/i.test(this.lastLiteError)) this.liteConnectionFailures++;
    else this.liteQueryErrors++;
    if (server.failures >= 2) server.retireRequested = true;
  }

  async chooseServer(attempted, deadline) {
    while (this.running && Date.now() < deadline) {
      for (const server of [...this.pool]) if (server.retireRequested) this.retireServer(server);
      const candidates = this.pool.filter(server => !server.retired && !server.retireRequested
        && !attempted.has(server.configIndex) && (server.failedUntil || 0) <= Date.now());
      candidates.sort((a, b) => Number(b.engine.isReady()) - Number(a.engine.isReady())
        || a.inFlight - b.inFlight || a.latency - b.latency);
      if (candidates.length) {
        // Reserve synchronously before the async caller yields; otherwise all
        // four workers can observe the same least-loaded slot simultaneously.
        candidates[0].inFlight++;
        return candidates[0];
      }
      if (this.pool.every(server => attempted.has(server.configIndex))) return null;
      await this.wait(Math.min(100, deadline - Date.now()));
    }
    return null;
  }

  enqueue(value, receivedAt = Date.now()) {
    let event;
    try { event = transactionEvent(value, receivedAt); } catch { this.gap("Invalid finalized transaction event"); return false; }
    this.events++;
    if (!this.shouldTrack(event.destination)) return false;
    this.matchedEvents++;
    if (this.queue.has(event.transactionHash) || this.active.has(event.transactionHash) || this.completed.has(event.transactionHash)) return false;
    if (this.queue.size >= 256) { this.dropped++; this.gap("Inclusion queue capacity exceeded"); return false; }
    this.queue.set(event.transactionHash, event);
    this.pump();
    return true;
  }

  pump() {
    while (this.running && this.active.size < MAX_WORKERS && (this.queue.size || this.healthNeeded && !this.active.has("health"))) {
      const isHealth = this.healthNeeded && !this.active.has("health");
      const [hash, event] = isHealth ? ["health", null] : this.queue.entries().next().value;
      if (isHealth) this.healthNeeded = false;
      else this.queue.delete(hash);
      // A previous exact confirmation may have cleared this destination while
      // another finalized event was queued. That event no longer needs a read.
      if (!isHealth && !this.shouldTrack(event.destination)) continue;
      const generation = this.generation;
      const task = (isHealth ? this.probeHealth() : this.hydrate(event)).then(confirmation => {
        if (!this.running) return;
        this.lastRpcAt = new Date().toISOString();
        if (isHealth) this.healthChecks++;
        else {
          this.verified++;
          this.lastHydrationAt = this.lastRpcAt;
          this.completed.set(hash, Date.now());
          while (this.completed.size > 2048) this.completed.delete(this.completed.keys().next().value);
        }
        if (this.generation === generation) {
          this.hydratedGeneration = generation;
          this.lastError = null;
        }
        if (confirmation && this.shouldTrack(confirmation.destination)) {
          this.onConfirm(confirmation);
          this.confirmations++;
        }
        this.publish();
      }).catch(() => {
        if (!isHealth && !this.shouldTrack(event.destination)) return;
        if (this.running) { this.failures++; this.gap(isHealth ? "Lite recovery check failed" : "Unable to verify finalized transaction BOC"); }
      }).finally(() => { this.active.delete(hash); this.pump(); });
      this.active.set(hash, task);
    }
  }

  async probeHealth() {
    const deadline = Date.now() + DEADLINE_MS;
    const attempted = new Set();
    for (let attempt = 0; attempt < 3 && this.running; attempt++) {
      const server = await this.chooseServer(attempted, deadline);
      if (!server) break;
      attempted.add(server.configIndex);
      const { engine, client } = server;
      try {
        const attemptDeadline = Math.min(deadline, Date.now() + 1500);
        while (this.running && !engine.isReady() && Date.now() < attemptDeadline) await this.wait(Math.min(100, attemptDeadline - Date.now()));
        const timeout = attemptDeadline - Date.now();
        if (!this.running || !engine.isReady() || timeout < 1) throw new Error("Lite connection not ready");
        this.requests++;
        const now = await client.getCurrentTime({ timeout });
        if (!Number.isSafeInteger(now) || Math.abs(now * 1000 - Date.now()) > 60000) throw new Error("Invalid lite-server time");
        return null;
      } catch (error) { this.serverFailed(server, error); }
      finally { server.inFlight--; if (server.retireRequested) this.retireServer(server); }
    }
    throw new Error("Lite RPC unavailable");
  }

  async hydrate(event) {
    const deadline = event.receivedAt + DEADLINE_MS;
    if (Date.now() >= deadline) { this.expiredCursors++; throw new Error("Inclusion cursor deadline expired"); }
    if (!this.pool.length) throw new Error("Lite-server pool unavailable");
    const attempted = new Set();
    for (let attempt = 0; attempt < 3 && this.running; attempt++) {
      const server = await this.chooseServer(attempted, deadline);
      if (!server) break;
      attempted.add(server.configIndex);
      const { engine, client } = server;
      try {
        const attemptDeadline = Math.min(deadline, Date.now() + 1500);
        while (this.running && !engine.isReady() && Date.now() < attemptDeadline) await this.wait(Math.min(100, attemptDeadline - Date.now()));
        const timeout = attemptDeadline - Date.now();
        if (!this.running || !engine.isReady() || timeout < 1) throw new Error("Lite connection not ready");
        this.requests++;
        const started = Date.now();
        const result = await client.getAccountTransactions(Address.parse(event.destination), event.lt,
          Buffer.from(event.transactionHash, "hex"), 1, { timeout });
        const confirmation = verifyTransaction(result, event);
        server.latency = Date.now() - started;
        server.failures = 0;
        server.failedUntil = 0;
        server.retireRequested = false;
        return confirmation;
      } catch (error) { this.serverFailed(server, error); }
      finally { server.inFlight--; if (server.retireRequested) this.retireServer(server); }
    }
    throw new Error("Finalized transaction unavailable within deadline");
  }

  async consume(response, controller) {
    if (!response.ok || !response.body) throw new Error(`Finalized stream HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.includes("text/event-stream")) throw new Error("Invalid finalized stream content type");
    this.connected = true;
    this.lastMessageAt = new Date().toISOString();
    this.publish();
    this.requestHealth();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    try {
      while (this.running) {
        const idle = setTimeout(() => controller.abort(), IDLE_MS);
        let next;
        try { next = await reader.read(); } finally { clearTimeout(idle); }
        if (next.done) break;
        this.lastMessageAt = new Date().toISOString();
        buffered += decoder.decode(next.value, { stream: true });
        if (Buffer.byteLength(buffered) > MAX_BYTES) throw new Error("Finalized stream buffer exceeded");
        const events = buffered.split(/\r?\n\r?\n/);
        buffered = events.pop();
        for (const event of events) {
          const lines = event.split(/\r?\n/);
          const type = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
          if (type && type !== "message") continue;
          const body = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
          if (!body) continue;
          let value;
          try { value = parseExact(body); } catch { this.gap("Malformed finalized transaction event"); continue; }
          this.enqueue(value);
        }
      }
    } finally {
      controller.abort();
      await reader.cancel().catch(() => {});
      this.connected = false;
    }
  }

  async loop() {
    let failures = 0;
    while (this.running) {
      const controller = new AbortController();
      this.controllers.add(controller);
      let headerTimer;
      const started = Date.now();
      try {
        await this.loadPool();
        if (!this.running) break;
        headerTimer = setTimeout(() => controller.abort(), DEADLINE_MS);
        this.connections++;
        const response = await this.fetch(SOURCE, { headers: { accept: "text/event-stream", authorization: "Bearer " + this.key },
          signal: controller.signal, redirect: "error" });
        clearTimeout(headerTimer);
        await this.consume(response, controller);
        if (this.running) this.gap("Finalized transaction stream ended");
      } catch (error) {
        if (this.running) this.gap(error.name === "AbortError" ? "Finalized transaction stream timed out" : error.message || "Finalized transaction stream unavailable");
      } finally {
        clearTimeout(headerTimer);
        controller.abort();
        this.controllers.delete(controller);
        this.connected = false;
      }
      if (!this.running) break;
      this.publish();
      this.reconnects++;
      failures = Date.now() - started > IDLE_MS ? 0 : failures + 1;
      await this.wait(Math.min(30000, 1000 * 2 ** Math.min(failures, 5)));
    }
  }

  start() {
    if (this.running) return;
    if (!this.key) { this.publish(); return; }
    this.running = true;
    this.publish();
    this.loopTask = this.loop();
  }

  async stop() {
    this.running = false;
    this.connected = false;
    clearTimeout(this.recoveryTimer);
    this.healthNeeded = false;
    for (const controller of this.controllers) controller.abort();
    for (const entry of [...this.waits]) entry.finish();
    for (const { engine } of this.pool) engine.close();
    this.pool = [];
    this.queue.clear();
    await Promise.allSettled([this.loopTask, ...this.active.values()].filter(Boolean));
    this.active.clear();
    this.completed.clear();
    this.publish();
  }
}

module.exports = { PendingInclusions, transactionEvent, verifyTransaction };
