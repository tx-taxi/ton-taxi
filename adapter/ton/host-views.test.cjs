"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {AsyncLocalStorage} = require("node:async_hooks");
const {api} = require("./api.cjs");
const social = require("../ton-social.cjs");

const shard = "8000000000000000";
const hosts = ["ton.tx.taxi", "masterchain.ton.tx.taxi"];
function fixture() {
  const header = (workchain, seqno) => ({workchain_id: String(workchain), shard, seqno: String(seqno),
    gen_utime: "1790571000", tx_quantity: "3", root_hash: "1".repeat(64),
    prev_refs: [`(${workchain},${shard},${seqno - 1})`],
    value_flow: {fees_collected: {grams: "1000000"}, created: {grams: "1000000000"}}});
  const collector = {
    blocks: [header(-1, 100)], observedAt: "2026-09-28T04:00:00Z",
    cached: n => header(-1, n),
    basechain: {cached: n => header(0, n), dashboard: () => ({head: header(0, 200), observedAt: "2026-09-28T04:00:00Z"})},
    dashboard: ({workchain}) => ({workchain, shard, head: header(workchain, workchain === 0 ? 200 : 100),
      observedAt: "2026-09-28T04:00:00Z", stale: false}),
  };
  const provider = {context: new AsyncLocalStorage(), request: async route => {
    const match = /^\((-?\d+),[a-f0-9]{16},(\d+)\)$/.exec(decodeURIComponent(route.split("/").pop()));
    assert.ok(match, "only a full block tuple should reach the provider");
    return {data: header(Number(match[1]), Number(match[2])), at: Date.now(), stale: false, provider: "fixture"};
  }};
  return {collector, provider, request: (host, path) => api(new URL(`https://${host}/api/ton/${path}`), provider, collector)};
}

test("simultaneous host dashboard and block requests retain independent defaults with one collector", async () => {
  const {request} = fixture();
  const [base, master] = await Promise.all(hosts.map(host => request(host, "dashboard")));
  assert.equal(base.workchain, 0); assert.equal(base.head.seqno, "200");
  assert.equal(master.workchain, -1); assert.equal(master.head.seqno, "100");
  const lists = await Promise.all(hosts.map(host => request(host, "blocks?limit=3")));
  assert.deepEqual(lists[0].blocks.map(block => block.seqno), ["200", "199", "198"]);
  assert.deepEqual(lists[1].blocks.map(block => block.seqno), ["100", "99", "98"]);
  for (const [i, workchain] of [0, -1].entries())
    assert.ok(lists[i].blocks.every(block => Number(block.workchain_id) === workchain));
  assert.equal((await request(hosts[1], "dashboard?workchain=0")).workchain, 0);
  assert.equal((await request(hosts[0], "dashboard?workchain=-1")).workchain, -1);
  await assert.rejects(request(hosts[1], "blocks?shard=4000000000000000"), /Invalid masterchain shard/);
});

test("numeric searches use host scope while explicit and legacy pasted block identities survive either host", async () => {
  const {request} = fixture();
  assert.equal((await request(hosts[0], "resolve?value=42")).id, `(0,${shard},42)`);
  assert.equal((await request(hosts[1], "resolve?value=42")).id, `(-1,${shard},42)`);
  assert.equal((await request(hosts[1], "resolve?value=42&workchain=0")).id, `(0,${shard},42)`);
  for (const host of hosts) {
    assert.equal((await request(host, "block/42")).workchain_id, "-1");
    for (const source of hosts) {
      for (const id of ["42", "%34%32"])
        assert.equal((await request(host, "resolve?value=" + encodeURIComponent(`https://${source}/block/${id}`))).id, `(-1,${shard},42)`);
      for (const workchain of [0, -1]) {
        const id = `(${workchain},${shard},42)`;
        assert.equal((await request(host, "resolve?value=" + encodeURIComponent(`https://${source}/block/${encodeURIComponent(id)}`))).id, id);
      }
    }
  }
  await assert.rejects(request(hosts[0], "resolve?value=" + encodeURIComponent("https://masterchain.ton.tx.taxi.example/block/42")), /Unsupported URL/);
});

test("SSR canonical URLs and social metadata use the requested approved host without losing explicit entity identity", async () => {
  const {provider, collector} = fixture();
  const html = '<!doctype html><html><head><title>old</title><link rel="canonical" href="https://old.invalid/"><meta property="og:url" content="https://old.invalid/"></head><body></body></html>';
  for (const host of hosts) {
    const root = await social.metadata("/", api, provider, collector, host);
    assert.equal(root.canonical, `https://${host}/`);
    assert.equal(new URL(root.image).hostname, host);
    assert.match(root.title, new RegExp(host.replaceAll(".", "\\.")));
    const pathname = `/block/(0,${shard},42)`;
    const page = await social.inject(html, pathname, api, provider, collector, host);
    assert.ok(page.includes(`href="https://${host}${pathname}"`));
    assert.ok(!page.includes("old.invalid"));
    assert.ok(page.includes(`content="https://${host}/og/block/`));
  }
  const untrusted = await social.metadata("/", api, provider, collector, "masterchain.ton.tx.taxi.example");
  assert.equal(untrusted.canonical, "https://ton.tx.taxi/");
});
