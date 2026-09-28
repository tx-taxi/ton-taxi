"use strict";

// Controlled handler verification only: real server/API code, fixture data,
// EventEmitter transports. This never opens a socket or contacts a provider.
// Run from the repository root: node review/ton-hosts/server-check.cjs
const assert = require("node:assert/strict");
const { AsyncLocalStorage } = require("node:async_hooks");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { runInNewContext } = require("node:vm");

const serverFile = path.resolve(__dirname, "../../adapter/ton-server.cjs");
const adapterRequire = createRequire(serverFile);
const { api } = adapterRequire("./ton/api.cjs");
const { normalize } = adapterRequire("./ton/collector.cjs");
const { ProviderError } = adapterRequire("./ton/provider.cjs");
const rootShard = "8000000000000000", leftShard = "4000000000000000", rightShard = "c000000000000000";
const observedAt = "2026-09-28T15:00:00.000Z";
const header = (workchain, shard) => ({
  workchain_id: workchain, shard, seqno: 42, gen_utime: 1790607600,
  tx_quantity: workchain === -1 ? 3 : 25, prev_refs: [],
  value_flow: { fees_collected: { grams: "1000000" } },
});
const headers = [header(-1, rootShard), header(0, leftShard), header(0, rightShard), header(0, rootShard)];
const byId = new Map(headers.map(item => [normalize(item).id, item]));
let collector, pending, httpHandler, collectorCount = 0, listenIntercepted = 0;
const transport = new EventEmitter();
transport.listen = () => { listenIntercepted++; }; // Inert transport; never node:http.listen.
transport.close = () => {};

class FixtureProvider {
  context = new AsyncLocalStorage();
  health() { return { status: "fixture" }; }
  async request(route) {
    const match = /^\/v2\/blockchain\/blocks\/([^/]+)$/.exec(route);
    const data = match && byId.get(decodeURIComponent(match[1]));
    assert.ok(data, "Unexpected fixture provider route: " + route);
    return { data, at: Date.parse(observedAt), stale: false, provider: "controlled-fixture" };
  }
}

class FixtureCollector {
  constructor(_provider, options) {
    collectorCount++;
    collector = this;
    this.options = options;
    this.blocks = [headers[0]];
    this.observedAt = observedAt;
    this.basechain = { health: () => ({ status: "fixture" }), cached: () => undefined };
  }
  async restore() {}
  async start() {}
  async refresh() { throw new Error("Populated fixtures must not refresh a provider"); }
  health() { return { status: "fixture" }; }
  dashboard(selection = { workchain: 0 }) {
    const workchain = selection.workchain;
    const shard = selection.shard || (workchain === -1 ? rootShard : leftShard);
    const head = byId.get(`(${workchain},${shard},42)`);
    assert.ok(head, "Unexpected fixture stream");
    return { workchain, shard, head, blocks: [normalize(head)], observedAt, stale: false };
  }
  snapshot(selection) {
    const { blocks, workchain, shard, observedAt, stale } = this.dashboard(selection);
    return { blocks, ton: { workchain, shard, observedAt, stale } };
  }
}

class FixturePending {
  constructor(options) { pending = this; this.options = options; }
  start() {}
  snapshot() { return { state: "live", messages: [] }; }
  health() { return { status: "fixture" }; }
}

class FixtureSocket extends EventEmitter {
  readyState = 1;
  bufferedAmount = 0;
  messages = [];
  send(raw) { this.messages.push(JSON.parse(raw)); }
  end(raw) { this.rejected = raw; }
  destroy() { this.destroyed = true; }
  close() { this.readyState = 3; this.emit("close"); }
  async message(value) {
    await Promise.all(this.listeners("message").map(listener => listener(JSON.stringify(value))));
    return this.messages.at(-1);
  }
}

class FixtureWebSocketServer extends EventEmitter {
  handleUpgrade(_req, socket, _head, callback) { callback(socket); }
}

const imports = {
  "node:http": { createServer(handler) { httpHandler = handler; return transport; } },
  "node:fs/promises": { async stat() { throw new Error("No static files in this fixture"); }, async readFile(filename) {
    assert.equal(path.basename(filename), "index.html");
    return Buffer.from('<!doctype html><html><head><title>fixture</title></head><body></body></html>');
  } },
  "node:path": path,
  ws: { WebSocketServer: FixtureWebSocketServer },
  "./ton-social.cjs": adapterRequire("./ton-social.cjs"),
  "./ton/provider.cjs": { Provider: FixtureProvider, ProviderError },
  "./ton/collector.cjs": { Collector: FixtureCollector, normalize },
  "./ton/pending.cjs": { PendingCollector: FixturePending },
  "./ton/pending-inclusions.cjs": { PendingInclusions: class { start() {} health() { return { status: "fixture" }; } } },
  "./ton/credentials.cjs": { tonApiKey: () => "" },
  "./ton/api.cjs": { api },
  "./ton/block-selection.cjs": adapterRequire("./ton/block-selection.cjs"),
  "./ton/block-route.cjs": adapterRequire("./ton/block-route.cjs"),
};

runInNewContext(readFileSync(serverFile, "utf8"), {
  require(name) { assert.ok(Object.hasOwn(imports, name), "Unexpected server dependency: " + name); return imports[name]; },
  __dirname: path.dirname(serverFile), URL, URLSearchParams, Buffer, setTimeout, clearTimeout,
  process: { env: {}, on() {} }, console,
}, { filename: serverFile });

async function request(host, url) {
  const response = {
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body == null ? null : this.headers["Content-Type"]?.startsWith("application/json") ? JSON.parse(body) : String(body); },
  };
  await httpHandler({ method: "GET", headers: { host }, url }, response);
  return response;
}

function connect(host, query = "") {
  const socket = new FixtureSocket();
  transport.emit("upgrade", { headers: { host }, url: "/api/v1/ws" + query }, socket, Buffer.alloc(0));
  return socket;
}

function assertSnapshot(snapshot, id) {
  assert.equal(snapshot.blocks[0].id, id);
  assert.equal(snapshot.ton.workchain, snapshot.blocks[0].ton.workchain_id);
  assert.equal(snapshot.ton.shard, snapshot.blocks[0].ton.shard);
  assert.equal(snapshot.ton.observedAt, observedAt);
}

async function main() {
  const baseId = `(0,${leftShard},42)`, masterId = `(-1,${rootShard},42)`, rightId = `(0,${rightShard},42)`;
  let httpCases = 0;
  for (const [host, id, workchain] of [["ton.tx.taxi", baseId, 0], ["masterchain.ton.tx.taxi", masterId, -1]]) {
    for (const endpoint of ["/api/v1/init-data", "/api/ton/dashboard"]) {
      const response = await request(host, endpoint);
      assert.equal(response.status, 200, host + endpoint);
      assert.equal(response.body.blocks[0].id, id);
      assert.equal(response.body.ton?.workchain ?? response.body.workchain, workchain);
      httpCases++;
    }
    for (const endpoint of ["/api/v1/blocks", "/api/blocks", "/api/v1/blocks/42"]) {
      const response = await request(host, endpoint);
      assert.equal(response.status, 200, host + endpoint);
      assert.equal(response.body[0].id, id);
      httpCases++;
    }
    const query = workchain === 0 ? "?workchain=-1" : "?workchain=0&shard=" + rightShard;
    const overridden = await request(host, "/api/v1/init-data" + query);
    assert.equal(overridden.body.blocks[0].id, workchain === 0 ? masterId : rightId);
    const numeric = await request(host, "/api/ton/resolve?value=42");
    assert.equal(numeric.body.id, id);
    const tuple = await request(host, "/api/ton/resolve?value=" + encodeURIComponent(workchain === 0 ? masterId : baseId));
    assert.equal(tuple.body.id, workchain === 0 ? masterId : baseId);
    const short = await request(host, "/api/ton/block/42");
    assert.equal(short.body._strip.id, workchain === 0 ? `(0,${rootShard},42)` : masterId);
    httpCases += 4;
  }
  for (const [host, tuple, expected] of [
    ["ton.tx.taxi", `(0,${rootShard},42)`, "/block/42?showDetails=true"],
    ["ton.tx.taxi", baseId, `/block/42?shard=${leftShard}&showDetails=true`],
    ["ton.tx.taxi", masterId, "https://masterchain.ton.tx.taxi/block/42?showDetails=true"],
    ["masterchain.ton.tx.taxi", baseId, `https://ton.tx.taxi/block/42?shard=${leftShard}&showDetails=true`],
  ]) {
    const response = await request(host, "/block/" + encodeURIComponent(tuple) + "?workchain=0&showDetails=true");
    assert.equal(response.status, 308);
    assert.equal(response.headers.Location, expected);
    httpCases++;
  }
  const localized = await request("ton.tx.taxi", `/en/block/${encodeURIComponent(baseId)}?view=details`);
  assert.equal(localized.status, 308);
  assert.equal(localized.headers.Location, `/en/block/42?shard=${leftShard}&view=details`);
  httpCases++;
  const splitPage = await request("ton.tx.taxi", `/block/42?shard=${leftShard}`);
  assert.equal(splitPage.status, 200);
  assert.ok(splitPage.body.includes(`href="https://ton.tx.taxi/block/42?shard=${leftShard}"`));
  assert.ok(splitPage.body.includes(`content="https://ton.tx.taxi/og/block/(0%2C${leftShard}%2C42).png?v=4"`));
  httpCases++;

  const base = connect("ton.tx.taxi"), master = connect("masterchain.ton.tx.taxi");
  const override = connect("masterchain.ton.tx.taxi", "?workchain=0&shard=" + rightShard);
  await Promise.all([base, master, override].map(socket => socket.message({ action: "init" })));
  assertSnapshot(base.messages.at(-1), baseId);
  assertSnapshot(master.messages.at(-1), masterId);
  assertSnapshot(override.messages.at(-1), rightId);

  assertSnapshot(await base.message({ action: "select", workchain: -1 }), masterId);
  assertSnapshot(await master.message({ action: "select", workchain: 0, shard: rightShard }), rightId);
  assertSnapshot(await base.message({ action: "init", shard: rootShard }), masterId);
  assertSnapshot(await master.message({ action: "select", shard: leftShard }), baseId);
  for (const [socket, workchain, shard] of [[base, -1, rootShard], [master, 0, leftShard], [override, 0, rightShard]]) {
    const pong = await socket.message({ action: "ping" });
    assert.equal(pong.pong, true);
    assert.deepEqual(pong.ton, { observedAt, stale: false, workchain, shard });
  }

  collector.options.onUpdate();
  assertSnapshot(base.messages.at(-1), masterId);
  assertSnapshot(master.messages.at(-1), baseId);
  assertSnapshot(override.messages.at(-1), rightId);
  pending.options.onUpdate({ state: "live", messages: [{ hash: "fixture-message" }] });
  assert.equal(base.messages.at(-1).ton.workchain, -1);
  assert.equal(master.messages.at(-1).ton.shard, leftShard);
  assert.equal(override.messages.at(-1).ton.shard, rightShard);
  assert.equal(base.messages.at(-1).ton.observedAt, observedAt);
  assert.equal(base.messages.at(-1).tonPending.messages[0].hash, "fixture-message");

  const rejected = connect("masterchain.ton.tx.taxi", "?shard=" + leftShard);
  assert.match(rejected.rejected, /^HTTP\/1\.1 400/);
  assert.equal(rejected.listenerCount("message"), 0);
  const beforeClose = master.messages.length;
  master.close();
  collector.options.onUpdate();
  assert.equal(master.messages.length, beforeClose);
  assertSnapshot(base.messages.at(-1), masterId);
  assertSnapshot(override.messages.at(-1), rightId);
  assert.equal(collectorCount, 1);
  assert.equal(listenIntercepted, 1);
  console.log(JSON.stringify({
    status: "passed", verification: "controlled in-process HTTP/WebSocket handlers; no real network or browser",
    httpCases, simultaneousSockets: 3, collectors: collectorCount,
    checked: ["host defaults", "query overrides", "numeric search", "short routes and tuple redirects", "shard-specific SSR", "socket init/select/ping", "selected block and pending broadcasts", "invalid upgrade", "closed socket removal"],
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
