export interface TonChainSelection {
  workchain: 0 | -1;
  shard?: string;
}

export interface TonBlockIdentity extends TonChainSelection {
  shard: string;
  seqno: string;
  id: string;
}

export const TON_ROOT_SHARD = '8000000000000000';
export const TON_BASECHAIN_ORIGIN = 'https://ton.tx.taxi';
export const TON_MASTERCHAIN_ORIGIN = 'https://masterchain.ton.tx.taxi';

export function tonHostnameWorkchain(hostname: string): 0 | -1 {
  return hostname.toLowerCase() === 'masterchain.ton.tx.taxi' ? -1 : 0;
}

/** Workchain switches keep list routes, but never reuse another chain's shard. */
export function tonWorkchainDestination(workchain: unknown, sourceUrl: string, current: TonChainSelection): string {
  const selected = tonChainSelection(workchain);
  const source = new URL(sourceUrl);
  const path = /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?(?:blocks\/?)?$/.test(source.pathname) ? source.pathname : '/';
  const destination = new URL(path, selected.workchain === -1 ? TON_MASTERCHAIN_ORIGIN : TON_BASECHAIN_ORIGIN);
  if (selected.workchain === 0 && current.workchain === 0 && current.shard) destination.searchParams.set('shard', current.shard);
  return destination.href;
}

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

/** Display routes are short; API requests, caches and strip context retain tuples. */
export function tonBlockIdentity(block: any, selection?: TonChainSelection): TonBlockIdentity | null {
  const value = typeof block === 'object' && block !== null ? block.id ?? block.ton?.id : block;
  const tuple = /^\((-?\d+),([0-9a-f]{16}),(\d+)\)$/i.exec(String(value ?? ''));
  const scope = tuple ? { workchain: Number(tuple[1]), shard: tuple[2].toLowerCase() }
    : tonBlockScope(block) || selection;
  const seqno = String(tuple?.[3] ?? block?.ton?.seqno ?? block?.seqno ?? block?.height ?? value ?? '');
  if (!scope || ![0, -1].includes(scope.workchain) || !/^\d+$/.test(seqno) || Number(seqno) > 4294967295) return null;
  const shard = scope.shard || TON_ROOT_SHARD;
  if (!/^[0-9a-f]{16}$/i.test(shard) || /^0+$/.test(shard) || scope.workchain === -1 && shard !== TON_ROOT_SHARD) return null;
  const normalizedSeqno = String(Number(seqno));
  return { workchain: scope.workchain as 0 | -1, shard: shard.toLowerCase(), seqno: normalizedSeqno, id: `(${scope.workchain},${shard.toLowerCase()},${normalizedSeqno})` };
}

export function tonLocalePrefix(pathname: string): string {
  const locale = /^\/([a-z]{2}(?:-[A-Z]{2})?)(?:\/|$)/.exec(pathname)?.[1];
  return locale && locale !== 'tx' ? '/' + locale : '';
}

export function tonBlockUrl(block: unknown, selection?: TonChainSelection, sourcePath = ''): string | null {
  const identity = tonBlockIdentity(block, selection);
  if (!identity) return null;
  const origin = identity.workchain === -1 ? TON_MASTERCHAIN_ORIGIN : TON_BASECHAIN_ORIGIN;
  return `${origin}${tonLocalePrefix(sourcePath)}/block/${identity.seqno}${identity.shard === TON_ROOT_SHARD ? '' : '?shard=' + identity.shard}`;
}

export function tonSelectionForBlockId(id: unknown, selection: TonChainSelection = { workchain: 0, shard: TON_ROOT_SHARD }): TonChainSelection | null {
  const identity = tonBlockIdentity(id, selection);
  return identity ? { workchain: identity.workchain, shard: identity.shard } : null;
}

/** Preserve the full block identity when generating a link from a router result. */
export function tonBlockIdentityFromUrl(value: string): TonBlockIdentity | null {
  const url = new URL(value, TON_BASECHAIN_ORIGIN);
  const block = /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?block\/([^/]+)\/?$/.exec(url.pathname);
  if (!block) return null;
  try {
    return tonBlockIdentity(decodeURIComponent(block[1]), tonChainSelection(url.searchParams.get('workchain') ?? tonHostnameWorkchain(url.hostname), url.searchParams.get('shard') ?? TON_ROOT_SHARD));
  } catch { return null; }
}
