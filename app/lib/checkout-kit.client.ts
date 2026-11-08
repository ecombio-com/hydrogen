// Checkout Kit for Web wiring. Client only, imported once from entry.client.tsx.
// Links marked data-checkout-kit keep href="/address", which the server redirects to Shopify checkout.
// If the Kit script, the prefetch or the popup fails, the browser simply follows that link.
const KIT_TARGET = 'popup'; // 'popup' or 'auto' (new tab)
const KIT_TELEMETRY = 'true'; // 'false' opts out of Shopify's anonymous diagnostics
const URL_ENDPOINT = '/api/checkout-url';
const SELECTOR = 'a[data-checkout-kit]';
const MAX_AGE_MS = 30_000;
const REFRESH_MS = 10_000;

type KitElement = HTMLElement & {src: string; open: () => void};

let kitLoad: Promise<void> | null = null;
let inflight: Promise<void> | null = null;
let cached: {url: string; at: number} | null = null;
let element: KitElement | null = null;

function loadKit() {
  kitLoad ??= import('@shopify/checkout-kit/shopify-checkout')
    .then(() => undefined)
    .catch(() => undefined);
  return kitLoad;
}

function kitReady() {
  return Boolean(customElements.get('shopify-checkout'));
}

function prefetch() {
  // KIT_LOAD_GATED: the Kit script loads only after the server returns a URL
  if (inflight) return;
  if (cached && Date.now() - cached.at < REFRESH_MS) return;
  inflight = fetch(URL_ENDPOINT, {headers: {Accept: 'application/json'}, credentials: 'same-origin'})
    .then((res) => (res.ok ? (res.json() as Promise<{url?: string | null}>) : null))
    .then((data) => {
      cached = data?.url ? {url: data.url, at: Date.now()} : null;
      if (cached) void loadKit();
    })
    .catch(() => {
      cached = null;
    })
    .finally(() => {
      inflight = null;
    });
}

function onComplete(event: Event) {
  const orderId = (event as CustomEvent).detail?.checkout?.order?.id ?? null;
  window.dispatchEvent(new CustomEvent('checkout-kit:complete', {detail: {orderId}}));
  window.location.assign('/payment/complete?kit=1' + (orderId ? '&order=' + encodeURIComponent(String(orderId)) : ''));
}

function onError() {
  window.location.assign(cached?.url ?? '/cart');
}

function getElement(): KitElement {
  if (element?.isConnected) return element;
  const el = document.createElement('shopify-checkout') as KitElement;
  el.setAttribute('target', KIT_TARGET);
  el.setAttribute('telemetry', KIT_TELEMETRY);
  el.addEventListener('complete', onComplete);
  el.addEventListener('error', onError);
  document.body.appendChild(el);
  element = el;
  return el;
}

function onClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(SELECTOR) || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const fresh = cached && Date.now() - cached.at < MAX_AGE_MS ? cached.url : null;
  if (!fresh || !kitReady()) {
    prefetch();
    return; // default navigation: /address -> server redirect to Shopify checkout
  }
  event.preventDefault();
  const el = getElement();
  el.src = fresh;
  el.open();
}

function warm(event: Event) {
  const target = event.target;
  if (target instanceof Element && target.closest(SELECTOR)) prefetch();
}

function init() {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerover', warm, {passive: true});
  document.addEventListener('touchstart', warm, {passive: true});
  document.addEventListener('focusin', warm);
  document.addEventListener('click', onClick);
  let timer: number | undefined;
  new MutationObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (document.querySelector(SELECTOR)) prefetch();
    }, 200);
  }).observe(document.body, {childList: true, subtree: true});
  window.setTimeout(() => {
    if (document.querySelector(SELECTOR)) prefetch();
  }, 1500);
}

init();



