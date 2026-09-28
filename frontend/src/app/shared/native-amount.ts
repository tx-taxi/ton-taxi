import type { NativeAmount, NativeQuote } from './native-view.types';

export interface AmountDisplay { value: string; unit: string; title: string; stale: boolean; }

function parts(value: string): { units: bigint; decimals: number } | null {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(value);
  if (!match) return null;
  const exponent = Number(match[4] || 0);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 255) return null;
  const fraction = match[3] || '';
  const decimals = fraction.length - exponent;
  const units = BigInt((match[1] === '-' ? '-' : '') + match[2] + fraction);
  return { units: decimals < 0 ? units * 10n ** BigInt(-decimals) : units, decimals: Math.max(0, decimals) };
}

/** Formats exact atomic units without passing through a floating point number. */
export function exactUnits(atomic: string | null | undefined, decimals: number, group = true): string | null {
  if (!/^-?\d+$/.test(String(atomic)) || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) return null;
  const units = BigInt(atomic);
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(decimals + 1, '0');
  const integer = decimals ? digits.slice(0, -decimals) : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, '') : '';
  return (negative ? '-' : '') + (group ? BigInt(integer).toLocaleString('en-US') : integer) + (fraction ? '.' + fraction : '');
}

function fiatValue(atomic: string, decimals: number, quote: NativeQuote): string | null {
  const rate = parts(quote.value);
  if (!rate || rate.units <= 0n) return null;
  let formatter: Intl.NumberFormat;
  try { formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }); } catch { return null; }
  const precision = formatter.resolvedOptions().maximumFractionDigits;
  const product = BigInt(atomic) * rate.units;
  const negative = product < 0n;
  const absolute = negative ? -product : product;
  const scale = decimals + rate.decimals;
  const denominator = 10n ** BigInt(Math.max(0, scale - precision));
  const numerator = scale < precision ? absolute * 10n ** BigInt(precision - scale) : absolute;
  const small = numerator > 0n && numerator < denominator;
  const rounded = small ? 1n : (numerator + denominator / 2n) / denominator;
  const digits = rounded.toString().padStart(precision + 1, '0');
  const integer = precision ? digits.slice(0, -precision) : digits;
  const fraction = precision ? digits.slice(-precision) : '';
  const formatted = formatter.formatToParts(negative ? -1 : 1).map(part => {
    if (part.type === 'integer') return BigInt(integer).toLocaleString('en-US');
    if (part.type === 'fraction') return fraction;
    return part.value;
  }).join('');
  return (small ? (negative ? '>' : '<') : '') + formatted;
}

export function displayNativeAmount(amount: NativeAmount, mode: 'btc'|'sats'|'fiat', currency: string, fallback?: NativeQuote | null): AmountDisplay {
  const exact = exactUnits(amount.atomic, amount.decimals);
  const unavailable = { value: '—', unit: '', title: 'Amount unavailable', stale: false };
  if (exact === null) return unavailable;
  const title = `${exact} ${amount.symbol} · ${exactUnits(amount.atomic, 0)} ${amount.atomicSymbol || 'atomic units'}`;
  if (amount.native && mode === 'sats') return { value: exactUnits(amount.atomic, 0), unit: amount.atomicSymbol || 'atomic units', title, stale: false };
  const quote = amount.quote === undefined ? fallback : amount.quote;
  if (mode === 'fiat' && (amount.native || quote)) {
    if (!quote || quote.currency.toUpperCase() !== currency.toUpperCase()) return { value: '—', unit: '', title: `${title} · ${currency} price unavailable`, stale: false };
    const value = fiatValue(amount.atomic, amount.decimals, quote);
    return { value: value ?? '—', unit: '', title: `${title} · ${quote.stale ? 'Last available price' : 'Price'}${quote.observedAt ? ' as of ' + quote.observedAt : ''}`, stale: !!quote.stale };
  }
  return { value: exact, unit: amount.symbol, title, stale: false };
}
