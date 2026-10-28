// Preferences shared by tx.taxi hosts. Keep URL language and server-rendered
// content independent of cookies so crawlers always receive stable pages.
export const SHARED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY'];

export function readSharedPreference(name: 'txtaxi_language' | 'txtaxi_currency'): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(part => part.startsWith(name + '='));
  if (!match) return null;
  try { return decodeURIComponent(match.slice(name.length + 1)); } catch { return null; }
}

export function writeSharedPreference(name: 'txtaxi_language' | 'txtaxi_currency', value: string): void {
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  const host = location.hostname.toLowerCase();
  const domain = (host === 'tx.taxi' || host.endsWith('.tx.taxi')) ? '; Domain=.tx.taxi' : '';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax${domain}${secure}`;
}

export function supportedSharedCurrency(): string | null {
  const value = readSharedPreference('txtaxi_currency');
  return value && SHARED_CURRENCIES.includes(value) ? value : null;
}
