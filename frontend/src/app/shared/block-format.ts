import '@angular/localize/init';
import type { NativeAmount, TonBlockTransactionFees } from './native-view.types';

const DECIMALS = 9, SYMBOL = 'GRAM';

// Presentation only: never round provider data or detail-page amounts.
export function compactBlockNumber(value: number, amount = false, locale = 'en-US'): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs > 0 && abs < 0.001) return (value < 0 ? '>−' : '<') + (0.001).toLocaleString(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false });
  if (abs >= 1000) {
    const units = ['', 'k', 'M', 'B', 'T'];
    let group = Math.min(4, Math.floor(Math.log10(abs) / 3));
    let scaled = Number((value / 1000 ** group).toPrecision(3));
    if (Math.abs(scaled) >= 1000 && group < 4) { group++; scaled /= 1000; }
    return scaled.toLocaleString(locale, { maximumSignificantDigits: 3, useGrouping: false }) + units[group];
  }
  return value.toLocaleString(locale, amount
    ? { minimumFractionDigits: 2, maximumFractionDigits: 3, useGrouping: false }
    : { maximumSignificantDigits: 3, useGrouping: false });
}

export function compactBlockAmount(value: number | string, atomic = false, locale = 'en-US'): string {
  if (value == null) return '—';
  return compactBlockNumber(Number(value) / (atomic ? 1 : 10 ** DECIMALS), !atomic, locale);
}

export function exactBlockAmount(value: number | string): string {
  if (value == null) return '—';
  try {
    const n = BigInt(value), abs = n < 0n ? -n : n, scale = 10n ** BigInt(DECIMALS);
    const fraction = (abs % scale).toString().padStart(DECIMALS, '0').replace(/0+$/, '');
    return (n < 0n ? '-' : '') + (abs / scale).toString() + (fraction ? '.' + fraction : '');
  } catch { return '—'; }
}

export function blockValueDetails(total: number | string, median: number, min: number, max: number): string {
  return $localize`:@@ton.block.fees-collected:Fees collected: ${exactBlockAmount(total)}:amount: ${SYMBOL}:symbol:. Includes block creation and imported fees.`;
}

export function transactionFeeView(stats: TonBlockTransactionFees | null | undefined): {
  total: NativeAmount | null; median: NativeAmount | null; min: NativeAmount | null; max: NativeAmount | null;
  medianBelowAtomicUnit: boolean; title: string;
} {
  const atomic = (value: unknown): value is string => typeof value === 'string' && /^\d+$/.test(value);
  const amount = (value: string, atomicSymbol = 'ng/tx'): NativeAmount => ({
    atomic: value, decimals: DECIMALS, symbol: SYMBOL, atomicSymbol, native: true, quote: null,
  });
  if (stats?.complete !== true || !Number.isSafeInteger(stats.transactionCount) || stats.transactionCount < 0 || !atomic(stats.total)) {
    return { total: null, median: null, min: null, max: null, medianBelowAtomicUnit: false, title: $localize`:@@ton.block.fees-unavailable:Transaction fees unavailable.` };
  }
  const count = stats.transactionCount;
  const median = count > 0 && atomic(stats.median) ? amount(stats.median) : null;
  const min = count > 0 && atomic(stats.min) ? amount(stats.min) : null;
  const max = count > 0 && atomic(stats.max) ? amount(stats.max) : null;
  const ratio = stats.medianExact;
  const fractional = median && atomic(ratio?.remainder) && atomic(ratio?.denominator)
    && BigInt(ratio.denominator) > 0n && BigInt(ratio.remainder) > 0n && BigInt(ratio.remainder) < BigInt(ratio.denominator);
  const unavailable = $localize`:@@ton.block.unavailable:unavailable`;
  const exactMedian = !median ? unavailable : !fractional ? stats.median
    : ratio.denominator === '2' ? stats.median + '.5' : `${stats.median} + ${ratio.remainder}/${ratio.denominator}`;
  const range = min && max ? stats.min + '–' + stats.max + ' ng/tx' : unavailable;
  const distribution = count === 0 ? $localize`:@@ton.block.no-transactions:No transactions; median and range unavailable.`
    : $localize`:@@ton.block.fee-distribution:Median: ${exactMedian}:median: ng/tx. Range: ${range}:range:.`;
  const totalText = exactBlockAmount(stats.total);
  const title = count === 1
    ? $localize`:@@ton.block.transaction-fees-one:Transaction fees: ${totalText}:total: GRAM across ${count}:count: transaction in this block. ${distribution}:distribution: ng/tx means nanograms per transaction; 1 GRAM = 1,000,000,000 nanograms.`
    : $localize`:@@ton.block.transaction-fees-many:Transaction fees: ${totalText}:total: GRAM across ${count}:count: transactions in this block. ${distribution}:distribution: ng/tx means nanograms per transaction; 1 GRAM = 1,000,000,000 nanograms.`;
  return {
    total: amount(stats.total, 'nanograms'), median, min, max,
    medianBelowAtomicUnit: !!fractional && stats.median === '0',
    title,
  };
}
