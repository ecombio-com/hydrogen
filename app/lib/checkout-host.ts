// Every Shopify checkout link is moved to our custom checkout domain, store.ecombio.com
// (connected to the live store khkkyb-b8 as its Checkout domain).
const DEV_STORE_CHECKOUT_HOSTS = new Set([
  'khkkyb-b8.myshopify.com',
  'ecombio.myshopify.com',
  'checkout.bicyclebio.com',
]);

export function forceCheckoutHost<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!DEV_STORE_CHECKOUT_HOSTS.has(u.host)) return url;
    u.host = 'store.ecombio.com';
    u.searchParams.delete('preview_theme_id');
    return u.toString() as T;
  } catch {
    return url;
  }
}
