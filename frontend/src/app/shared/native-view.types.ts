/** Exact view inputs shared by the existing explorer presentation components. */
export interface NativeQuote {
  currency: string;
  /** Fiat units per whole coin/token, expressed as a decimal string. */
  value: string;
  observedAt?: string;
  stale?: boolean;
}

export interface NativeAmount {
  atomic: string | null | undefined;
  decimals: number;
  symbol: string;
  atomicSymbol?: string;
  assetId?: string;
  /** Native amounts follow the shared coin / atomic / fiat preference. */
  native?: boolean;
  quote?: NativeQuote | null;
}

/** Complete local transaction fees for one exact TON block, in nanograms. */
export interface TonBlockTransactionFees {
  transactionCount: number;
  complete: true;
  total: string;
  min: string | null;
  max: string | null;
  median: string | null;
  medianExact: { remainder: string; denominator: string } | null;
}

export interface NativeIdentity {
  address: string;
  displayName?: string | null;
  name?: string | null;
  iconUrl?: string | null;
  tokenSymbol?: string | null;
  isContract?: boolean | null;
  isVerified?: boolean | null;
  isScam?: boolean | null;
  reputation?: string | null;
}
