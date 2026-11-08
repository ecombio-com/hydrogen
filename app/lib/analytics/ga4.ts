type Params = Record<string, unknown>;
type Subscribe = (event: string, cb: (payload: any) => void) => void;
type GtagWindow = {
  gtag?: (...args: unknown[]) => void;
  Shopify?: {
    customerPrivacy?: {
      currentVisitorConsent?: () => Record<string, string>;
      shouldShowBanner?: () => boolean;
      analyticsProcessingAllowed?: () => boolean;
      marketingAllowed?: () => boolean;
    };
  };
};

const IS_DEV = import.meta.env.DEV;
const win = () => window as unknown as GtagWindow;

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function send(event: string, params: Params) {
  const payload = IS_DEV ? {...params, debug_mode: true} : params;
  if (IS_DEV) console.debug('[ga4]', event, payload);
  win().gtag?.('event', event, payload);
}

// item_id is the numeric tail of the Shopify variant GID.
const idTail = (gid: string) => gid.split('/').pop() ?? gid;

function toItem(p: any, quantity = p.quantity): Params {
  return {
    item_id: idTail(p.variantId),
    item_name: p.title,
    item_brand: p.vendor,
    item_variant: p.variantTitle,
    item_category: p.productType || undefined,
    price: Number(p.price),
    quantity,
  };
}

function lineToItem(line: unknown, quantity: number): Params | null {
  const variantId = get(line, 'merchandise.id');
  if (typeof variantId !== 'string') return null;
  return {
    item_id: idTail(variantId),
    item_name: String(get(line, 'merchandise.product.title') ?? get(line, 'merchandise.title') ?? ''),
    item_brand: get(line, 'merchandise.product.vendor') ?? undefined,
    item_variant: get(line, 'merchandise.title') ?? undefined,
    price: Number(get(line, 'merchandise.price.amount') ?? 0),
    quantity,
  };
}

function cartLines(cart: unknown): unknown[] {
  const nodes = get(cart, 'lines.nodes');
  if (Array.isArray(nodes)) return nodes;
  const edges = get(cart, 'lines.edges');
  if (Array.isArray(edges)) return edges.map((e) => get(e, 'node'));
  return [];
}

const sumValue = (items: Params[]) =>
  items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);

function startConsentSync(): () => void {
  const apply = (analytics: boolean, marketing: boolean) => {
    const m = marketing ? 'granted' : 'denied';
    win().gtag?.('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: m,
      ad_user_data: m,
      ad_personalization: m,
    });
  };

  const readCurrent = (): boolean => {
    const cp = win().Shopify?.customerPrivacy;
    const c = cp?.currentVisitorConsent?.();
    if (!c) return false;
    if (c.analytics === '' && c.marketing === '') {
      if (cp?.shouldShowBanner?.() !== false) return false;
      apply(cp?.analyticsProcessingAllowed?.() ?? false, cp?.marketingAllowed?.() ?? false);
      return true;
    }
    apply(c.analytics === 'yes', c.marketing === 'yes');
    return true;
  };

  const onConsent = (e: Event) => {
    const d = (e as CustomEvent<{analyticsAllowed?: boolean; marketingAllowed?: boolean}>).detail;
    if (d) apply(Boolean(d.analyticsAllowed), Boolean(d.marketingAllowed));
  };
  document.addEventListener('visitorConsentCollected', onConsent);

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (readCurrent() || tries > 40) window.clearInterval(timer);
  }, 500);

  return () => {
    document.removeEventListener('visitorConsentCollected', onConsent);
    window.clearInterval(timer);
  };
}

function lineEvent(name: 'add_to_cart' | 'remove_from_cart', p: any) {
  const line = p.currentLine ?? p.prevLine;
  const now = Number(get(p.currentLine, 'quantity') ?? 0);
  const before = Number(get(p.prevLine, 'quantity') ?? 0);
  const item = lineToItem(line, Math.abs(now - before) || 1);
  if (!item) {
    if (IS_DEV) console.warn('[ga4] skipped', name, 'line shape not recognized', line);
    return;
  }
  send(name, {currency: p.shop?.currency, value: sumValue([item]), items: [item]});
}

/** Wire GA4 to Hydrogen's analytics bus. Returns a cleanup function. */
export function startGa4(subscribe: Subscribe): () => void {
  subscribe('page_viewed', (p) =>
    send('page_view', {page_location: p.url ?? window.location.href, page_title: document.title}),
  );
  subscribe('product_viewed', (p) => {
    const items = p.products.map((x: any) => toItem(x));
    send('view_item', {currency: p.shop?.currency, value: sumValue(items), items});
  });
  subscribe('search_viewed', (p) => send('search', {search_term: p.searchTerm}));
  subscribe('cart_viewed', (p) => {
    const items = cartLines(p.cart)
      .map((l) => lineToItem(l, Number(get(l, 'quantity') ?? 1)))
      .filter((i): i is Params => i !== null);
    if (items.length) send('view_cart', {currency: p.shop?.currency, value: sumValue(items), items});
  });
  subscribe('product_added_to_cart', (p) => lineEvent('add_to_cart', p));
  subscribe('product_removed_from_cart', (p) => lineEvent('remove_from_cart', p));
  // Not mapped: collection_viewed has no items, so view_item_list needs custom work.
  return startConsentSync();
}
