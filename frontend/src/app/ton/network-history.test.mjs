import test from 'node:test';
import assert from 'node:assert/strict';
import { tonNetworkHistory } from './network-history.ts';

// Production 2026-09-28: the old timestamp Map silently discarded same-second
// blocks, leaving only 22 usable intervals from 2,048 genuine observations.
const observed = [
  ['95544316', '1790570273', '2711869549'],
  ['95544317', '1790570273', '3711669051'],
  ['95544318', '1790570274', '2700000000'],
  ['95544319', '1790570274', '2703416614'],
  ['95544320', '1790570275', '2700540742'],
  ['95544321', '1790570275', '2700792574'],
  ['95544322', '1790570275', '2700285871'],
].map(([seqno, timestamp, fees]) => ({seqno, timestamp, fees}));

test('same-second blocks retain every collected fee without inventing timestamps', () => {
  const points = tonNetworkHistory(observed);
  assert.deepEqual(points.map(point => point.timestamp), [1790570273, 1790570274, 1790570275]);
  assert.equal(points.reduce((count, point) => count + point.blockCount, 0), 7);
  assert.equal(points.reduce((fees, point) => fees + BigInt(point.feeTotalAtomic), 0n), 19928574401n);
  assert.equal(points[0].feeTotalAtomic, '6423538600');
  assert.equal(points[0].fees, 3.2117693);
});

test('a second containing three blocks contributes three intervals to the observed mean', () => {
  const points = tonNetworkHistory(observed);
  assert.equal(points[0].interval, 0);
  assert.equal(points[1].interval, 0.5);
  assert.equal(points[2].interval, 1 / 3);
  assert.equal((points[0].interval + points[1].interval * 2 + points[2].interval * 3) / 6, 1 / 3);
});

test('missing heights break continuity even when both sides have the same timestamp', () => {
  const points = tonNetworkHistory([observed[0], observed[1], observed[4], observed[6]]);
  assert.deepEqual(points.map(point => point.blockCount), [2, 1, 1]);
  assert.deepEqual(points.map(point => point.gapBefore), [false, true, true]);
  assert.equal(points[1].timestamp, points[2].timestamp);
  assert.equal(points[1].interval, undefined);
  assert.equal(points[2].interval, undefined);
  assert.equal(points.reduce((count, point) => count + point.blockCount, 0), 4);
});

test('unknown fees remain unknown and exact totals survive amounts above the safe integer limit', () => {
  const points = tonNetworkHistory([
    {seqno: 1, timestamp: 100, fees: null},
    {seqno: 2, timestamp: 101, fees: '9007199254740993'},
    {seqno: 3, timestamp: 101, fees: '2'},
    {seqno: 4, timestamp: 101, fees: null},
  ]);
  assert.equal(points[0].fees, undefined);
  assert.equal(points[0].feeAtomic, undefined);
  assert.equal(points[1].feeTotalAtomic, '9007199254740995');
  assert.equal(points[1].feeAtomic, '4503599627370497');
  assert.equal(points[1].feeCount, 2);
  assert.equal(points[1].blockCount, 3);
});
