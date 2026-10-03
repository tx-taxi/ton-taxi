"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MilestoneHistory } = require('./milestone-history.cjs');
const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, '../../review/milestones', name), 'utf8'));
const index = fixture('index-50000000.json');
const header = fixture('header-50000000.json');

test('a historical milestone resolves its first real shard instead of the current root shard', async () => {
  let requested;
  const history = new MilestoneHistory({ request: async route => { requested = decodeURIComponent(route); return { data: header }; } }, {
    fetcher: async () => new Response(JSON.stringify(index)),
  });
  const block = await history.get(50000000);
  assert.equal(block.id, '(0,6000000000000000,50000000)');
  assert.equal(block.timestamp, 1739624950);
  assert.equal(block.tx_count, 19);
  assert.ok(requested.endsWith(block.id));
});

test('a header from a different fork is rejected rather than assigned the milestone date', async () => {
  const history = new MilestoneHistory({ request: async () => ({ data: { ...header, root_hash: '0'.repeat(64) } }) }, {
    fetcher: async () => new Response(JSON.stringify(index)),
  });
  await assert.rejects(history.get(50000000), /verification failed/);
});

test('an index outage does not permanently cache missing historical data', async () => {
  let calls = 0;
  const history = new MilestoneHistory({ request: async () => ({ data: header }) }, {
    fetcher: async () => ++calls === 1 ? new Response('', { status: 503 }) : new Response(JSON.stringify(index)),
  });
  await assert.rejects(history.get(50000000), /unavailable/);
  assert.equal((await history.get(50000000)).id, '(0,6000000000000000,50000000)');
});
