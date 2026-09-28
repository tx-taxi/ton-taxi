import test from 'node:test';
import assert from 'node:assert/strict';
import { scaledJettonUnits } from './scaled-ui.ts';

// The old UI displayed unscaled on-chain balances. These cases exercise actual
// TEP-526 behavior and TVM rounding boundaries, not labels or implementation shape.
test('current balances apply the display multiplier before decimal formatting', () => {
  assert.equal(scaledJettonUnits('123456789', {numerator:'3', denominator:'2'}), '185185184');
  assert.equal(scaledJettonUnits('15', {numerator:'2', denominator:'3'}), '10');
  assert.equal(scaledJettonUnits('15'), '15');
});
test('nearest rounding below, exactly at and above a positive half', () => {
  assert.equal(scaledJettonUnits('4', {numerator:'1', denominator:'10'}), '0');
  assert.equal(scaledJettonUnits('5', {numerator:'1', denominator:'10'}), '1');
  assert.equal(scaledJettonUnits('6', {numerator:'1', denominator:'10'}), '1');
  assert.equal(scaledJettonUnits('5', {numerator:'1', denominator:'2'}), '3');
});
test('TVM signed ties round toward positive infinity, not away from zero', () => {
  assert.equal(scaledJettonUnits('-4', {numerator:'1', denominator:'10'}), '0');
  assert.equal(scaledJettonUnits('-5', {numerator:'1', denominator:'10'}), '0');
  assert.equal(scaledJettonUnits('-6', {numerator:'1', denominator:'10'}), '-1');
  assert.equal(scaledJettonUnits('-5', {numerator:'1', denominator:'2'}), '-2');
  assert.equal(scaledJettonUnits('5', {numerator:'-1', denominator:'-2'}), '3');
});
test('integer precision survives values and products beyond JavaScript safe integers', () => {
  assert.equal(scaledJettonUnits('9007199254740993', {numerator:'3', denominator:'2'}), '13510798882111490');
  assert.equal(scaledJettonUnits('100000000000000000000000000000000000001', {numerator:'100000000000000000000000000000000000001', denominator:'100000000000000000000000000000000000001'}), '100000000000000000000000000000000000001');
});
test('invalid multipliers cannot masquerade as a valid unscaled balance', () => {
  for (const multiplier of [{numerator:'1',denominator:'0'},{numerator:'0',denominator:'1'},{numerator:'1.5',denominator:'1'},{numerator:'1',denominator:'NaN'}]) assert.equal(scaledJettonUnits('123', multiplier), null);
  assert.equal(scaledJettonUnits(9007199254740993, {numerator:'1',denominator:'1'}), null);
});

test('mainnet TEP-526 example TSUI supply uses the observed 10020/10000 multiplier', () => {
  // Source fixture: adapter/ton/evidence/scaled-jetton.json; 9 metadata decimals.
  assert.equal(scaledJettonUnits('700000000000', {numerator:'10020',denominator:'10000'}), '701400000000');
});
