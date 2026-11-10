// Checkout Kit for Web wiring. Client only, imported once from entry.client.tsx.
// Shopify checkout opens in a popup over the storefront; the storefront page is not navigated away.
// The link's own href (the Shopify checkout URL) is only followed as a last resort, when the Kit
// or the URL endpoint is unavailable.
const KIT_TARGET = 'popup'; // 'popup' or 'auto' (new tab)
const KIT_TELEMETRY = 'true'; // 'false' opts out of Shopify's anonymous diagnostics
const URL_ENDPOINT = '/api/checkout-url';
const SELECTOR = 'a[data-checkout-kit]';
const MAX_AGE_MS = 30_000;
const REFRESH_MS = 10_000;
const READY_TIMEOUT_MS = 6_000;

type KitElement = HTMLElement & {src: string; open: () => void};

let kitLoad: Promise<void> | null = null;
let inflight: Promise<void> | null = null;
let cached: {url: string; at: number} | null = null;
let element: KitElement | null = null;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function loadKit() {
  kitLoad ??= import('@shopify/checkout-kit/shopify-checkout')
    .then(() => undefined)
    .catch(() => undefined);
  return kitLoad;
}

function kitReady() {
  return Boolean(customElements.get('shopify-checkout'));
}

function freshUrl() {
  return cached && Date.now() - cached.at < MAX_AGE_MS ? cached.url : null;
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

// Resolves to a usable checkout URL once the URL is fresh and the Kit is registered, else null.
async function ensureReady(): Promise<string | null> {
  if (!freshUrl()) {
    cached = null;
    prefetch();
    await Promise.race([inflight, wait(READY_TIMEOUT_MS)]);
  }
  const url = freshUrl();
  if (!url) return null;
  await Promise.race([loadKit(), wait(READY_TIMEOUT_MS)]);
  return kitReady() ? url : null;
}

let completed = false;

// Fallback: the complete event may not fire for popups. On close, ask the server if the cart became an order.
function onClose() {
  if (completed) return;
  fetch('/api/checkout-status', {headers: {Accept: 'application/json'}, credentials: 'same-origin'})
    .then((res) => (res.ok ? (res.json() as Promise<{completed?: boolean}>) : null))
    .then((data) => {
      if (data?.completed) window.location.assign('/payment/complete?kit=1');
      else cached = null; // buyer closed without paying: fetch a fresh URL next time
    })
    .catch(() => undefined);
}

function onComplete(event: Event) {
  completed = true;
  const orderId = (event as CustomEvent).detail?.checkout?.order?.id ?? null;
  window.dispatchEvent(new CustomEvent('checkout-kit:complete', {detail: {orderId}}));
  window.location.assign('/payment/complete?kit=1' + (orderId ? '&order=' + encodeURIComponent(String(orderId)) : ''));
}

function onError(event: Event) {
  // Stay on the storefront. Drop the cached URL so the next click fetches a fresh one.
  console.error('[checkout-kit] error', (event as CustomEvent).detail?.error);
  cached = null;
  window.dispatchEvent(new CustomEvent('checkout-kit:error'));
}

function getElement(): KitElement {
  if (element?.isConnected) return element;
  const el = document.createElement('shopify-checkout') as KitElement;
  el.setAttribute('target', KIT_TARGET);
  el.setAttribute('telemetry', KIT_TELEMETRY);
  el.addEventListener('complete', onComplete);
  el.addEventListener('error', onError);
  el.addEventListener('close', onClose);
  document.body.appendChild(el);
  element = el;
  return el;
}

function openCheckout(url: string) {
  const el = getElement();
  el.src = url;
  el.open();
}

async function openWhenReady(link: HTMLAnchorElement) {
  link.setAttribute('aria-busy', 'true');
  try {
    const url = await ensureReady();
    if (url) {
      openCheckout(url);
      return;
    }
    window.dispatchEvent(new CustomEvent('checkout-kit:error'));
  } finally {
    link.removeAttribute('aria-busy');
  }
}

function onClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest<HTMLAnchorElement>(SELECTOR);
  if (!link || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const url = freshUrl();
  if (url && kitReady()) {
    openCheckout(url);
    return;
  }
  void openWhenReady(link);
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
