const test = require('node:test');
const assert = require('node:assert/strict');
const {Provider} = require('./provider.cjs');
const {api} = require('./api.cjs');

// Production block 95551104 had a verified count of three while the indexer
// initially returned an empty list. Those bytes must not become a day-long zero.
const id = '(-1,8000000000000000,95551104)';
const route = '/v2/blockchain/blocks/' + encodeURIComponent(id) + '/transactions';
const complete = {transactions: [
  {hash: '59d57ecabd0cdf378ed003de8ab6f2643ba61ba938c02052e55dd1ffdecfafea', block: id},
  {hash: '15bc758b114c12cf69c497bb24f711c9e3834ad4236f26276a59ca442aa532c3', block: id},
  {hash: '186b919e8ad90ff3f9104b49f02b2ae61b44e05873d92bd79639fd3e9804de90', block: id},
]};
function setup(count = 3) {
  const provider = new Provider();
  let calls = 0, payload = {transactions: []};
  provider.fetch = async () => { calls++; return {data: payload, at: Date.now(), provider: 'fixture'}; };
  const header = {workchain_id: '-1', shard: '8000000000000000', seqno: '95551104', gen_utime: '1790573047', tx_quantity: String(count)};
  const collector = {cached: () => header, blocks: [header], observedAt: new Date().toISOString()};
  return {provider, set: data => payload = data, calls: () => calls,
    read: () => api(new URL('http://fixture.invalid/api/ton/block/' + encodeURIComponent(id) + '/transactions?limit=50'), provider, collector)};
}

test('an incomplete indexed list stays unavailable and recovers to the verified count without cache poisoning', async () => {
  const h = setup();
  await assert.rejects(h.read(), error => error.status === 503);
  assert.equal(h.provider.cache.has(route), false);
  h.set({transactions: complete.transactions.slice(0, 2)});
  await assert.rejects(h.read(), error => error.status === 503);
  h.set(complete);
  assert.equal((await h.read()).transactions.length, 3);
  const calls = h.calls();
  h.set({transactions: []});
  assert.equal((await h.read()).transactions.length, 3);
  assert.equal(h.calls(), calls, 'complete immutable data is reused');
});

test('a previously cached false empty is invalidated instead of reused or served stale', async () => {
  const h = setup();
  await h.provider.request(route, 86400000);
  assert.equal(h.provider.cache.get(route).data.transactions.length, 0);
  await assert.rejects(h.read(), error => error.status === 503);
  assert.equal(h.provider.cacheBytes, 0);
  h.set(complete);
  assert.equal((await h.read()).transactions.length, 3);
});

test('a verified zero-transaction block may return and cache a real empty list', async () => {
  const h = setup(0);
  assert.deepEqual((await h.read()).transactions, []);
  assert.deepEqual((await h.read()).transactions, []);
  assert.equal(h.calls(), 1);
});

test('a validator joining an unvalidated in-flight request removes that exact incomplete cache entry', async () => {
  const h = setup();
  let finish;
  h.provider.fetch = () => new Promise(resolve => { finish = resolve; });
  const first = h.provider.request(route, 86400000);
  const validated = h.read();
  await new Promise(resolve => setImmediate(resolve));
  finish({data: {transactions: []}, at: Date.now(), provider: 'fixture'});
  await first;
  await assert.rejects(validated, error => error.status === 503);
  assert.equal(h.provider.cache.has(route), false);
  assert.equal(h.provider.cacheBytes, 0);
});
