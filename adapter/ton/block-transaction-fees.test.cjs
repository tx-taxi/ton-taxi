"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Cell, beginCell } = require("@ton/core");
const { BlockEconomics, blockIdentity } = require("./block-economics.cjs");
const { decodeHeader } = require("./context-headers.cjs");
const { normalize } = require("./collector.cjs");
const { api } = require("./api.cjs");
const fixtures = require("./fixtures/transaction-fees.json");
const bytes = fixture => fs.readFileSync(path.join(__dirname, "fixtures", fixture.file));
const liteIdentity = header => {
  const identity = blockIdentity(header);
  return { ...identity, rootHash: Buffer.from(identity.rootHash, "hex"), fileHash: Buffer.from(identity.fileHash, "hex") };
};
function transport(data) {
  const economics = new BlockEconomics();
  let calls = 0;
  economics.connectSlot = () => ({ query: async (fn, request) => {
    assert.equal(request.kind, "liteServer.getBlock");
    calls++;
    return { data };
  } });
  return { economics, calls: () => calls, hydrate: header => economics.hydrateOne(header, [{}], Date.now() + 5000) };
}

// Amounts come from separately indexed transaction responses and complete
// public block identities, not the decoder under test. The old normalization
// showed protocol creation/imports as fees and had no transaction distribution.
for (const fixture of fixtures) {
  test(`${fixture.file}: live and historical bytes yield complete exact transaction fees`, async () => {
    const data = bytes(fixture), source = transport(data);
    try {
      const live = await source.hydrate({ ...fixture.header, tx_quantity: String(fixture.header.tx_quantity) });
      const context = decodeHeader(data, liteIdentity(fixture.header));
      assert.equal(context.tx_quantity, fixture.header.tx_quantity);
      for (const header of [live, context]) {
        assert.deepEqual(header.transaction_fee_stats, fixture.expected);
        const strip = normalize(header);
        assert.deepEqual(strip.extras.transactionFees, fixture.expected);
        assert.equal(strip.extras.totalFees, fixture.expected.total);
        assert.equal(header.value_flow.fees_collected.grams, fixture.protocolCollected);
        assert.notEqual(strip.extras.totalFees, header.value_flow.fees_collected.grams);
      }
      await source.hydrate(fixture.header);
      assert.equal(source.calls(), 1, "same BOC supplies the complete fees and cached economics without transaction calls");
    } finally { source.economics.stop(); }
  });
}

test("mismatched indexed counts cannot publish complete fees, including shared concurrent reads", async () => {
  const fixture = fixtures[0], source = transport(bytes(fixture));
  try {
    const [mismatch, exact] = await Promise.all([
      source.hydrate({ ...fixture.header, tx_quantity: "3" }),
      source.hydrate(fixture.header),
    ]);
    assert.equal(mismatch.transaction_fee_stats, null);
    assert.equal(normalize(mismatch).extras.totalFees, null);
    assert.deepEqual(exact.transaction_fee_stats, fixture.expected);
    const cachedMismatch = await source.hydrate({ ...fixture.header, tx_quantity: "0" });
    assert.equal(cachedMismatch.transaction_fee_stats, null);
    assert.equal(source.calls(), 1);
  } finally { source.economics.stop(); }
});

test("unreadable optional fee data leaves authenticated protocol economics available", async () => {
  const fixture = fixtures[0], root = Cell.fromBoc(bytes(fixture))[0];
  const changed = new Cell({ bits: root.bits, refs: [...root.refs.slice(0, 3), beginCell().storeUint(0, 32).endCell()] });
  const data = changed.toBoc();
  const header = { ...fixture.header, root_hash: changed.hash().toString("hex"), file_hash: crypto.createHash("sha256").update(data).digest("hex") };
  const source = transport(data);
  try {
    const hydrated = await source.hydrate(header);
    assert.equal(hydrated.value_flow.fees_collected.grams, fixture.protocolCollected);
    assert.equal(hydrated.transaction_fee_stats, null);
    assert.equal(normalize(hydrated).extras.totalFees, null);
    assert.equal(source.calls(), 1, "optional enrichment failure must not retry or stop confirmed blocks");
  } finally { source.economics.stop(); }
});

test("detail strips reuse only matching verified cached stats while old metadata remains unavailable", async () => {
  const fixture = fixtures[0], source = transport(bytes(fixture));
  try {
    const verified = await source.hydrate(fixture.header);
    const legacy = { ...verified };
    delete legacy.transaction_fee_stats;
    assert.equal(normalize(legacy).extras.totalFees, null);
    assert.equal(normalize(legacy).extras.transactionFees, null);
    let cached = verified, calls = 0;
    const provider = { request: async () => { calls++; return { data: legacy, at: Date.now(), stale: false, provider: "indexed-fixture" }; } };
    const collector = { basechain: { cached: () => cached } };
    const url = new URL(`https://ton.tx.taxi/api/ton/block/${fixture.header.seqno}`);
    const warm = await api(url, provider, collector);
    assert.deepEqual(warm._strip.extras.transactionFees, fixture.expected);
    assert.equal(warm.value_flow.fees_collected.grams, fixture.protocolCollected);
    cached = { ...verified, root_hash: "0".repeat(64) };
    assert.equal((await api(url, provider, collector))._strip.extras.transactionFees, null);
    cached = legacy;
    assert.equal((await api(url, provider, collector))._strip.extras.totalFees, null);
    cached = null;
    assert.equal((await api(url, provider, collector))._strip.extras.totalFees, null);
    assert.equal(calls, 4, "one existing metadata request per detail read; fees trigger no new acquisition");
  } finally { source.economics.stop(); }
});
