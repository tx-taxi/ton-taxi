export interface TonChainSelection {
  workchain: 0 | -1;
  shard?: string;
}

export const TON_ROOT_SHARD = '8000000000000000';

export function tonChainSelection(workchain: unknown, shard?: unknown): TonChainSelection {
  const selectedWorkchain = String(workchain) === '-1' ? -1 : 0;
  const selectedShard = typeof shard === 'string' && /^[0-9a-f]{16}$/i.test(shard) ? shard.toLowerCase() : undefined;
  return { workchain: selectedWorkchain, ...(selectedWorkchain === -1 ? { shard: TON_ROOT_SHARD } : selectedShard ? { shard: selectedShard } : {}) };
}

export function tonSelectionKey(selection: TonChainSelection): string {
  return `${selection.workchain}:${selection.shard || ''}`;
}

export function tonSelectionQuery(selection: TonChainSelection): string {
  const query = new URLSearchParams({ workchain: String(selection.workchain) });
  if (selection.shard) query.set('shard', selection.shard);
  return query.toString();
}

/** Sequence numbers alone cannot identify a TON block or a shard's stream. */
export function tonBlockScope(block: any): { workchain: number; shard: string } | null {
  const tuple = /^\((-?\d+),([0-9a-f]{16}),\d+\)$/i.exec(String(block?.id || ''));
  const workchain = block?.ton?.workchain_id ?? block?.workchain_id ?? tuple?.[1];
  const shard = String(block?.ton?.shard ?? block?.shard ?? tuple?.[2] ?? '').toLowerCase();
  return workchain != null && Number.isInteger(Number(workchain)) && /^[0-9a-f]{16}$/.test(shard) ? { workchain: Number(workchain), shard } : null;
}

export function tonBlockMatchesSelection(block: any, selection: TonChainSelection): boolean {
  const scope = tonBlockScope(block);
  return !!scope && scope.workchain === selection.workchain && (!selection.shard || scope.shard === selection.shard);
}
