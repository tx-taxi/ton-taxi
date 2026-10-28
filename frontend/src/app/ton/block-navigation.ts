import { tonBlockIdentity, tonBlockUrl, tonHostnameWorkchain, tonLocalePrefix } from './chain-selection';
import { preferredTonHubUrl } from './hub-navigation';

export function navigateTonBlock(router: { navigateByUrl: (url: string, extras?: any) => unknown }, block: unknown, state?: unknown, hubMode = false): void {
  const identity = tonBlockIdentity(block);
  const href = tonBlockUrl(block, undefined, hubMode ? '' : window.location.pathname);
  if (!identity || !href) return;
  if (identity.workchain === tonHostnameWorkchain(window.location.hostname)) {
    const destination = new URL(href);
    // Angular's router is already mounted under the document's locale base.
    // Keep the locale in the browser href but not in the internal route tree.
    const locale = tonLocalePrefix(window.location.pathname);
    const path = locale && destination.pathname.startsWith(locale + '/')
      ? destination.pathname.slice(locale.length) : destination.pathname;
    void router.navigateByUrl(path + destination.search, state ? { state } : undefined);
  } else window.location.assign(hubMode ? preferredTonHubUrl(href) : href);
}
