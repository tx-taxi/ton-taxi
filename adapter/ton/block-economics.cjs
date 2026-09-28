"use strict";

const crypto = require("node:crypto");
const { Cell, loadCurrencyCollection } = require("@ton/core");
const { Functions } = require("ton-lite-client/dist/schema");
const { decodeShardTargets } = require("./shard-targets.cjs");

const GLOBAL_CONFIG_URL = "https://ton.org/global.config.json";
const BLOCK_TAG = 0x11ef55aa;
const VALUE_FLOW_TAG = 0xb8e48dfb;
const VALUE_FLOW_V2_TAG = 0x3ebf98b7;
const MAX_BOC_BYTES = 16 * 1024 * 1024;

let globalConfig;
let globalConfigExpires = 0;
let globalConfigPending;

class BlockEconomicsError extends Error {
  constructor(message, failures = []) {
    super(message);
    this.name = "BlockEconomicsError";
    this.status = 503;
    this.failures = failures;
  }
}

const timeout = (promise, milliseconds, message, cancel) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        cancel?.();
        reject(new Error(message));
      }, milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
};

function headerField(header, field) {
  return header?.[field] ?? header?.ton?.[field];
}

function signedShard(value) {
  const text = String(value);
  if (/^[0-9a-f]{16}$/i.test(text))
    return BigInt.asIntN(64, BigInt(`0x${text}`)).toString();
  if (/^-?\d+$/.test(text)) return BigInt.asIntN(64, BigInt(text)).toString();
  throw new Error("Invalid shard");
}

function hashHex(value) {
  const text = String(value || "");
  if (/^[0-9a-f]{64}$/i.test(text)) return text.toLowerCase();
  const bytes = Buffer.from(text, "base64");
  if (bytes.length === 32) return bytes.toString("hex");
  return "";
}

function blockIdentity(header) {
  const workchain = Number(headerField(header, "workchain_id") ?? headerField(header, "workchain"));
  const seqno = Number(headerField(header, "seqno"));
  const shard = signedShard(headerField(header, "shard"));
  const rootHash = hashHex(headerField(header, "root_hash"));
  const fileHash = hashHex(headerField(header, "file_hash"));
  if (
    !Number.isInteger(workchain) ||
    !Number.isSafeInteger(seqno) ||
    seqno < 0 ||
    !/^[0-9a-f]{64}$/.test(rootHash) ||
    !/^[0-9a-f]{64}$/.test(fileHash)
  )
    throw new Error("Header lacks a valid full block identity");
  return { workchain, shard, seqno, rootHash, fileHash };
}

function asCurrencyCollection(slice) {
  const collection = loadCurrencyCollection(slice);
  const other = [...collection.other || []]
    .map(([id, value]) => ({
      // CurrencyCollection uses HashmapE 32 with @ton/core's Uint(32) key;
      // IDs 2^31..2^32-1 are identifiers, not signed integer values.
      id: BigInt(id).toString(),
      value: value.toString(),
    }))
    .sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0));
  return { grams: collection.coins.toString(), other };
}

function decodeValueFlow(data) {
  if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_BOC_BYTES)
    throw new Error("Invalid block BOC size");
  const root = Cell.fromBoc(data)[0];
  const rootHash = root.hash().toString("hex");
  const block = root.beginParse();
  if (block.loadUint(32) !== BLOCK_TAG) throw new Error("Unexpected Block tag");
  block.loadInt(32); // global_id
  block.loadRef(); // BlockInfo is not part of header economics.
  const flowSlice = block.loadRef().beginParse();
  const tag = flowSlice.loadUint(32);
  if (tag !== VALUE_FLOW_TAG && tag !== VALUE_FLOW_V2_TAG)
    throw new Error("Unexpected ValueFlow tag");
  const firstFour = flowSlice.loadRef().beginParse();
  const value_flow = {
    from_prev_blk: asCurrencyCollection(firstFour),
    to_next_blk: asCurrencyCollection(firstFour),
    imported: asCurrencyCollection(firstFour),
    exported: asCurrencyCollection(firstFour),
    fees_collected: asCurrencyCollection(flowSlice),
  };
  if (tag === VALUE_FLOW_V2_TAG) value_flow.burned = asCurrencyCollection(flowSlice);
  const lastFour = flowSlice.loadRef().beginParse();
  value_flow.fees_imported = asCurrencyCollection(lastFour);
  value_flow.recovered = asCurrencyCollection(lastFour);
  value_flow.created = asCurrencyCollection(lastFour);
  value_flow.minted = asCurrencyCollection(lastFour);
  return { rootHash, value_flow };
}

function verifyBlockBoc(data, identity) {
  const decoded = decodeValueFlow(data);
  const fileHash = crypto.createHash("sha256").update(data).digest("hex");
  if (decoded.rootHash !== identity.rootHash || fileHash !== identity.fileHash)
    throw new Error("Lite server BOC hashes do not match requested header");
  return decoded.value_flow;
}

async function officialLiteServers(fetchImpl) {
  if (globalConfig && Date.now() < globalConfigExpires) return globalConfig;
  if (globalConfigPending) return globalConfigPending;
  globalConfigPending = (async () => {
    const response = await fetchImpl(GLOBAL_CONFIG_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Global config HTTP ${response.status}`);
    const parsed = await response.json();
    if (!Array.isArray(parsed.liteservers) || !parsed.liteservers.length)
      throw new Error("Global config has no lite servers");
    globalConfig = parsed.liteservers.filter(
      (server) => Number.isInteger(server?.ip) && Number.isInteger(server?.port) && server?.id?.key,
    );
    if (!globalConfig.length) throw new Error("Global config has no valid lite servers");
    globalConfigExpires = Date.now() + 60 * 60 * 1000;
    return globalConfig;
  })().finally(() => (globalConfigPending = null));
  return globalConfigPending;
}

class BlockEconomics {
  constructor({ concurrency = 3, timeoutMs = 8000, cacheTtlMs = 5 * 60 * 1000, fetchImpl = fetch } = {}) {
    this.concurrency = Math.min(3, Math.max(2, Number(concurrency) || 3));
    this.timeoutMs = Math.max(1000, Number(timeoutMs) || 8000);
    this.cacheTtlMs = Math.max(1000, Number(cacheTtlMs) || 5 * 60 * 1000);
    this.fetch = fetchImpl;
    this.cache = new Map();
    this.inFlight = new Map();
    this.engines = new Set();
    this.slots = Array.from({length: this.concurrency}, (_, index) => ({index, serverIndex: index, engine: null, busy: false}));
    this.connectionOpens = 0;
    this.connectionRotations = 0;
    this.stopped = false;
    this.requests = 0;
    this.failures = 0;
    this.lastError = null;
    this.hydrationQueue = Promise.resolve();
    this.hydrationPending = 0;
  }

  cacheKey(identity) {
    return `${identity.workchain}:${identity.shard}:${identity.seqno}:${identity.rootHash}:${identity.fileHash}`;
  }

  closeSlot(slot) {
    if (slot.engine) { this.engines.delete(slot.engine); slot.engine.close(); slot.engine = null; }
  }

  connectSlot(slot, server, deadline) {
    if (slot.engine?.closed) this.closeSlot(slot);
    if (slot.engine) return slot.engine;
    // Reuse the bounded ADNL transport already used by historical contexts.
    // The SDK engine schedules reconnects after disposal and retries internally.
    const {Connection} = require("./context-headers.cjs");
    slot.engine = new Connection(server, deadline);
    this.engines.add(slot.engine);
    this.connectionOpens++;
    return slot.engine;
  }

  async getBlock(identity, servers, batchDeadline) {
    const slot = this.slots.find(slot => !slot.busy);
    if (!slot) throw new BlockEconomicsError("Block economics workers busy");
    slot.busy = true;
    let lastError;
    const candidates = servers.slice(0, 15);
    const deadline = Math.min(Date.now() + this.timeoutMs, batchDeadline);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (this.stopped) throw new BlockEconomicsError("Block economics stopped");
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        const attemptTimeout = Math.min(3000, remaining);
        const roundRobin = this.connectSlot(slot, candidates[slot.serverIndex % candidates.length], Date.now() + attemptTimeout);
        try {
          this.requests++;
          const response = await timeout(
            roundRobin.query(Functions.liteServer_getBlock, {
              kind: "liteServer.getBlock",
              id: {kind: "tonNode.blockIdExt", ...identity, rootHash: Buffer.from(identity.rootHash, "hex"), fileHash: Buffer.from(identity.fileHash, "hex")},
            }, Date.now() + attemptTimeout),
            attemptTimeout, "Lite server request timed out", () => this.closeSlot(slot),
          );
          const value_flow = verifyBlockBoc(response.data, identity);
          return {value_flow, ...(identity.workchain === -1 ? {shard_refs: decodeShardTargets(response.data)} : {})};
        } catch (error) {
          lastError = error;
          this.closeSlot(slot);
          slot.serverIndex = (slot.serverIndex + 1) % candidates.length;
          this.connectionRotations++;
        }
      }
      throw lastError || new Error("No lite server response");
    } finally { slot.busy = false; }
  }

  async hydrateOne(header, servers, batchDeadline) {
    const identity = blockIdentity(header);
    const key = this.cacheKey(identity);
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return { ...header, ...cached.fields };
    if (this.inFlight.has(key)) return this.inFlight.get(key);
    const pending = this.getBlock(identity, servers, batchDeadline)
      .then((fields) => {
        this.cache.set(key, { fields, expires: Date.now() + this.cacheTtlMs });
        while (this.cache.size > 512) this.cache.delete(this.cache.keys().next().value);
        return { ...header, ...fields };
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, pending);
    return pending;
  }

  hydrate(headers) {
    if (this.hydrationPending >= 16) return Promise.reject(new BlockEconomicsError("Block economics busy"));
    this.hydrationPending++;
    const task = this.hydrationQueue.then(() => this.hydrateBatch(headers)).finally(() => this.hydrationPending--);
    this.hydrationQueue = task.catch(() => undefined);
    return task;
  }

  async hydrateBatch(headers) {
    if (this.stopped) throw new BlockEconomicsError("Block economics stopped");
    if (!Array.isArray(headers)) throw new TypeError("headers must be an array");
    if (!headers.length) return [];
    const servers = await officialLiteServers(this.fetch);
    // A cold 32-block strip must either finish promptly or fail as a unit; it
    // must not occupy the stream/recovery path while each stale block retries.
    const batchDeadline = Date.now() + Math.max(this.timeoutMs, 25000);
    const results = new Array(headers.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < headers.length) {
        if (Date.now() >= batchDeadline) throw new Error("Block economics batch timed out");
        const index = cursor++;
        results[index] = await this.hydrateOne(headers[index], servers, batchDeadline);
      }
    };
    const settled = await Promise.allSettled(
      Array.from({ length: Math.min(this.concurrency, headers.length) }, worker),
    );
    const failures = settled.filter((entry) => entry.status === "rejected").map((entry) => entry.reason?.message || String(entry.reason));
    if (failures.length) {
      this.failures += failures.length;
      this.lastError = failures[0];
      throw new BlockEconomicsError("Unable to verify complete block economics", failures);
    }
    this.lastError = null;
    return results;
  }

  health() {
    return {
      stopped: this.stopped,
      requests: this.requests,
      inFlight: this.inFlight.size,
      cacheEntries: this.cache.size,
      failures: this.failures,
      lastError: this.lastError,
      queuedBatches: this.hydrationPending,
      liteConnections: this.engines.size,
      connectionOpens: this.connectionOpens,
      connectionRotations: this.connectionRotations,
      globalConfigCached: Boolean(globalConfig && Date.now() < globalConfigExpires),
    };
  }

  stop() {
    this.stopped = true;
    for (const slot of this.slots) this.closeSlot(slot);
    this.engines.clear();
    this.inFlight.clear();
  }
}

module.exports = {
  BlockEconomics,
  BlockEconomicsError,
  decodeValueFlow,
  verifyBlockBoc,
  blockIdentity,
  asCurrencyCollection,
};
