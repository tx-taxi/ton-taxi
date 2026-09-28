import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as blockFormat from '../shared/block-format.ts';
import * as nativeAmount from '../shared/native-amount.ts';

// Exercise the actual shared Amount getter for the restored rows. Transaction
// fees stay in nanograms, while the block's summed fee is displayed in GRAM.
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../components/amount/amount.component.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText;
const imports = {
  '@angular/core': { Component: () => value => value, Input: () => () => {}, ChangeDetectionStrategy: { OnPush: 0 } },
  '@app/shared/block-format': blockFormat, '@app/shared/native-amount': nativeAmount,
};
new Function('require', 'module', 'exports', source)(name => imports[name] || {}, module, module.exports);
function display(amount, displayMode = 'sats') {
  const component = Object.assign(Object.create(module.exports.AmountComponent.prototype), {
    amount, displayMode, compactBlock: true, currency: 'USD', nativeQuotes: {},
  });
  return component.nativeDisplay;
}
const stats = overrides => ({ transactionCount: 4, complete: true, total: '13000', min: '0', median: '1500', max: '10000', medianExact: { remainder: '0', denominator: '2' }, ...overrides });

test('per-transaction atomic amounts retain small and zero fees while the total remains in GRAM', () => {
  // Four transaction fees: 0, 1000, 2000, 10000 nanograms.
  const fees = blockFormat.transactionFeeView(stats());
  assert.deepEqual([display(fees.min).value, display(fees.median).value, display(fees.max).value], ['0', '1.5k', '10k']);
  assert.equal(display(fees.median).unit, 'ng/tx');
  assert.equal(display(fees.total, 'btc').unit, 'GRAM');
  assert.match(display(fees.total, 'btc').title, /^0\.000013 GRAM/);
});

test('unavailable coverage cannot become zero fees, while an empty confirmed block has a known zero total', () => {
  for (const input of [null, undefined, stats({ complete: false })]) {
    const fees = blockFormat.transactionFeeView(input);
    assert.equal(fees.total, null);
    assert.equal(fees.median, null);
    assert.equal(fees.min, null);
    assert.equal(fees.max, null);
  }
  const empty = blockFormat.transactionFeeView(stats({ transactionCount: 0, total: '0', min: null, median: null, max: null, medianExact: null }));
  assert.equal(display(empty.total, 'btc').value, '0.00');
  assert.equal(empty.median, null);
  assert.equal(empty.min, null);
  assert.equal(empty.max, null);
});

test('even-count median remainders stay exact and a positive sub-nanogram median cannot display zero', () => {
  const half = blockFormat.transactionFeeView(stats({ transactionCount: 2, total: '1', min: '0', median: '0', max: '1', medianExact: { remainder: '1', denominator: '2' } }));
  assert.equal(half.medianBelowAtomicUnit, true);
  assert.match(half.title, /Median: 0\.5 ng\/tx/);
  const large = blockFormat.transactionFeeView(stats({ transactionCount: 2, total: '18014398509481987', min: '9007199254740993', median: '9007199254740993', max: '9007199254740994', medianExact: { remainder: '1', denominator: '2' } }));
  assert.match(large.title, /Median: 9007199254740993\.5 ng\/tx/);
  assert.match(large.title, /Transaction fees: 18014398\.509481987 GRAM/);
});
