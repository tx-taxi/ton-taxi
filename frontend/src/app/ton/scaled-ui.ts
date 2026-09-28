export interface ScaledUiMultiplier { numerator: unknown; denominator: unknown; }

function integer(value: unknown): bigint | null {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') return null;
  const text = String(value);
  return /^-?\d+$/.test(text) ? BigInt(text) : null;
}

/** TEP-526 / TVM MULDIVR: nearest integer, exact half ties toward +infinity. */
export function scaledJettonUnits(onchain: unknown, multiplier?: ScaledUiMultiplier | null): string | null {
  const units = integer(onchain);
  if (units === null) return null;
  if (multiplier == null) return units.toString();
  const numerator = integer(multiplier.numerator);
  let denominator = integer(multiplier.denominator);
  if (numerator === null || denominator === null || numerator === BigInt(0) || denominator === BigInt(0)) return null;
  let product = units * numerator;
  if (denominator < BigInt(0)) { product = -product; denominator = -denominator; }
  let quotient = product / denominator;
  let remainder = product % denominator;
  // JavaScript truncates division toward zero; TVM's nearest mode is floor(x/y + 1/2).
  if (remainder < BigInt(0)) { quotient -= BigInt(1); remainder += denominator; }
  if (remainder * BigInt(2) >= denominator) quotient += BigInt(1);
  return quotient.toString();
}
