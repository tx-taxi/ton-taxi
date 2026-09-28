import { TonPendingSnapshot } from './ton-pending.types';

export function initialTonPending(): TonPendingSnapshot {
  return {state: 'loading', observedAt: null, coverage: 'provider-observed', messages: [], totalObserved: null, truncated: false};
}

export function disconnectedTonPending(value: TonPendingSnapshot): TonPendingSnapshot {
  return {...value, state: value.observedAt ? 'stale' : 'unavailable'};
}

// This boundary also validates cached cross-origin hub handoffs.
export function readTonPending(value: unknown): TonPendingSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as TonPendingSnapshot;
  const timestamp = (v: unknown): v is string => typeof v === 'string' && v.length <= 32 && Number.isFinite(Date.parse(v));
  const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
  if (!['loading', 'ready', 'stale', 'unavailable'].includes(data.state)
      || data.coverage !== 'provider-observed' || typeof data.truncated !== 'boolean'
      || !(data.observedAt === null || timestamp(data.observedAt))
      || !Array.isArray(data.messages) || data.messages.length > 2000
      || !(data.totalObserved === null || Number.isSafeInteger(data.totalObserved) && data.totalObserved >= data.messages.length && data.totalObserved <= 10000)
      || data.state === 'ready' && (data.totalObserved === null || data.observedAt === null)) return null;
  const seen = new Set<string>();
  const messages = [];
  for (const row of data.messages) {
    if (!row || !hash(row.hash) || !hash(row.normalizedHash) || !hash(row.bodyHash)
        || typeof row.destination !== 'string' || !/^-?\d{1,3}:[a-f0-9]{64}$/.test(row.destination)
        || !Number.isSafeInteger(row.bocBytes) || row.bocBytes < 1 || row.bocBytes > 1048576
        || !timestamp(row.firstSeenAt) || !timestamp(row.lastSeenAt)
        || Date.parse(row.lastSeenAt) < Date.parse(row.firstSeenAt)) return null;
    const identity = row.destination + ':' + row.normalizedHash;
    if (seen.has(identity)) return null;
    seen.add(identity);
    messages.push({hash: row.hash, normalizedHash: row.normalizedHash, destination: row.destination,
      bodyHash: row.bodyHash, bocBytes: row.bocBytes, firstSeenAt: row.firstSeenAt, lastSeenAt: row.lastSeenAt});
  }
  return {state: data.state, observedAt: data.observedAt, coverage: data.coverage,
    messages, totalObserved: data.totalObserved, truncated: data.truncated};
}
