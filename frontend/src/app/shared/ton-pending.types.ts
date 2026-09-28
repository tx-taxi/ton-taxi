/** Provider-observed external messages, distinct from confirmed transactions. */
export interface TonPendingMessage {
  hash: string;
  normalizedHash: string;
  destination: string;
  bodyHash: string;
  bocBytes: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface TonPendingSnapshot {
  state: 'loading' | 'ready' | 'stale' | 'unavailable';
  observedAt: string | null;
  coverage: 'provider-observed';
  messages: TonPendingMessage[];
  totalObserved: number | null;
  truncated: boolean;
}
