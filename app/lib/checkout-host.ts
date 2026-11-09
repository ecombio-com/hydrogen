export function forceCheckoutHost<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.host = 'store.ecombio.com';
    u.searchParams.delete('preview_theme_id');
    return u.toString() as T;
  } catch {
    return url;
  }
}
