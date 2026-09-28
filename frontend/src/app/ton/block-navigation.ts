import { tonBlockIdentity, tonBlockUrl, tonHostnameWorkchain } from './chain-selection';

export function navigateTonBlock(router: { navigateByUrl: (url: string, extras?: any) => unknown }, block: unknown, state?: unknown): void {
  const identity = tonBlockIdentity(block);
  const href = tonBlockUrl(block, undefined, window.location.pathname);
  if (!identity || !href) return;
  if (identity.workchain === tonHostnameWorkchain(window.location.hostname)) {
    const destination = new URL(href);
    void router.navigateByUrl(destination.pathname + destination.search, state ? { state } : undefined);
  } else window.location.assign(href);
}
