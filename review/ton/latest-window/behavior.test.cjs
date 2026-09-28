const test = require('node:test');
const assert = require('node:assert/strict');
const { LatestNetworkWindow } = require('../../../adapter/ton/latest-network-window.cjs');
const { api } = require('../../../adapter/ton/api.cjs');
const value = height => ({ master_seqno: String(height), transactions: [{hash: 'tx-' + height}], _meta: { observedAt: '2026-09-28T04:00:00.000Z', stale: false }});

test('simultaneous and staggered latest readers share one observation until the refresh boundary', async () => {
  let now = 1000, calls = 0, height = 100, release;
  const cache = new LatestNetworkWindow({ now: () => now });
  const load = async () => { calls++; await new Promise(resolve => { release = resolve; }); return value(height); };
  const visitors = Array.from({length: 100}, () => cache.get('50:0', load));
  await Promise.resolve(); assert.equal(calls, 1); release();
  const results = await Promise.all(visitors); assert.ok(results.every(result => result.master_seqno === '100'));
  height = 110; now += 14000;
  assert.equal((await cache.get('50:0', load)).master_seqno, '100'); assert.equal(calls, 1);
  now += 1001;
  const refreshed = cache.get('50:0', load); await Promise.resolve(); assert.equal(calls, 2); release();
  assert.equal((await refreshed).master_seqno, '110');
});

test('outage retains a bounded truthful stale result, preserves observation time, and recovers', async () => {
  let now = 1000, calls = 0;
  const cache = new LatestNetworkWindow({ now: () => now });
  const original = await cache.get('50:0', async () => value(100));
  now += 15001;
  const fail = async () => { calls++; throw new Error('provider unavailable'); };
  const stale = await cache.get('50:0', fail);
  assert.equal(stale._meta.stale, true); assert.equal(stale._meta.observedAt, original._meta.observedAt); assert.equal(original._meta.stale, false);
  await Promise.all(Array.from({length: 100}, () => cache.get('50:0', fail))); assert.equal(calls, 1);
  now += 45000;
  await assert.rejects(cache.get('50:0', fail), /provider unavailable/);
  now += 1501;
  const recovered = await cache.get('50:0', async () => value(120)); assert.equal(recovered.master_seqno, '120'); assert.equal(recovered._meta.stale, false);
});

test('failed initial load remains an error and does not invent empty transactions', async () => {
  const cache = new LatestNetworkWindow(); let calls = 0;
  const fail = async () => { calls++; throw new Error('not found upstream'); };
  const outcomes = await Promise.allSettled(Array.from({length: 30}, () => cache.get('50:0', fail)));
  assert.ok(outcomes.every(result => result.status === 'rejected')); assert.equal(calls, 1);
});

test('public API latest cursor is shared across advancing heads while explicit historical cursors and paging remain exact', async () => {
  const calls = [];
  const provider = { request: async route => { calls.push(route); return {data: {transactions: [{hash: route}]}, at: Date.parse('2026-09-28T04:00:00Z'), provider: 'https://fixture.invalid', stale: false}; } };
  const collector = { blocks: [{seqno: '100'}] };
  const request = search => api(new URL('http://fixture.invalid/api/ton/network-transactions?' + search), provider, collector);
  const first = await request('limit=50'); collector.blocks[0].seqno = '115';
  const next = await Promise.all(Array.from({length: 100}, () => request('limit=50')));
  assert.equal(calls.length, 1); assert.ok(next.every(result => result.master_seqno === first.master_seqno));
  const historical = await request('limit=20&master_seqno=99&offset=40'); assert.equal(historical.master_seqno, '99'); assert.equal(historical._paging.offset, 40); assert.equal(historical._paging.limit, 20);
  const before = await request('limit=10&before=98'); assert.equal(before.master_seqno, '98');
  assert.deepEqual(calls, ['/v2/blockchain/masterchain/100/transactions?limit=50&offset=0', '/v2/blockchain/masterchain/99/transactions?limit=20&offset=40', '/v2/blockchain/masterchain/98/transactions?limit=10&offset=0']);
});
