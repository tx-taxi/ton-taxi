/** Let the hub apply only verified locale routes without changing the target origin. */
export function preferredTonHubUrl(destination: string): string {
  try {
    const preferred = (window as Window & { txTaxiPreferredUrl?: (url: string) => string }).txTaxiPreferredUrl;
    if (typeof preferred !== 'function') return destination;
    const original = new URL(destination);
    const localized = new URL(preferred(destination));
    return localized.origin === original.origin && !localized.username && !localized.password ? localized.href : destination;
  } catch {
    return destination;
  }
}
