// Dev store (ecombio.myshopify.com) only: its checkout links are moved to store.ecombio.com.
// Any other store (e.g. the live store khkkyb-b8) keeps the checkout URL Shopify returns.
const DEV_STORE_CHECKOUT_HOSTS = new Set(['ecombio.myshopify.com', 'checkout.bicyclebio.com']);

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
