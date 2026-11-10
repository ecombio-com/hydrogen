import type {I18nBase} from '@shopify/hydrogen';

export interface I18nLocale extends I18nBase {
  pathPrefix: string;
}

type Market = Pick<I18nBase, 'country' | 'language'>;

// Every locale the code knows, mapped to its Shopify market. Shopify has only English
// published, so a row requests EN until that language is published in Shopify.
const MARKETS = {
  'en-us': {country: 'US', language: 'EN'},
  'es-us': {country: 'US', language: 'ES'},
  'de-at': {country: 'AT', language: 'EN'},
  'fr-be': {country: 'BE', language: 'EN'},
  'de-de': {country: 'DE', language: 'EN'},
  'es-es': {country: 'ES', language: 'EN'},
  'fi-fi': {country: 'FI', language: 'EN'},
  'fr-fr': {country: 'FR', language: 'EN'},
  'it-it': {country: 'IT', language: 'EN'},
  'ja-jp': {country: 'JP', language: 'EN'},
  'nl-nl': {country: 'NL', language: 'EN'},
  'pt-pt': {country: 'PT', language: 'EN'},
  'sv-se': {country: 'SE', language: 'EN'},
  'en-ae': {country: 'AE', language: 'EN'},
  'en-au': {country: 'AU', language: 'EN'},
  'en-ca': {country: 'CA', language: 'EN'},
  'en-ch': {country: 'CH', language: 'EN'},
  'en-cz': {country: 'CZ', language: 'EN'},
  'en-dk': {country: 'DK', language: 'EN'},
  'en-gb': {country: 'GB', language: 'EN'},
  'en-hk': {country: 'HK', language: 'EN'},
  'en-ie': {country: 'IE', language: 'EN'},
  'en-il': {country: 'IL', language: 'EN'},
  'en-kr': {country: 'KR', language: 'EN'},
  'en-my': {country: 'MY', language: 'EN'},
  'en-no': {country: 'NO', language: 'EN'},
  'en-nz': {country: 'NZ', language: 'EN'},
  'en-pl': {country: 'PL', language: 'EN'},
  'en-sg': {country: 'SG', language: 'EN'},
} as const satisfies Record<string, Market>;

export type Locale = keyof typeof MARKETS;
export const LOCALES = Object.keys(MARKETS) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en-us';

// Live locales. Add one only after its Shopify market and copy are ready.
export const ENABLED_LOCALES: readonly Locale[] = ['en-us'];

export function isEnabledLocale(value: string): value is Locale {
  return (ENABLED_LOCALES as readonly string[]).includes(value);
}

export function getLocaleFromRequest(request: Request): I18nLocale {
  const first = new URL(request.url).pathname.split('/')[1]?.toLowerCase() ?? '';
  const locale = isEnabledLocale(first) ? first : DEFAULT_LOCALE;
  return {...MARKETS[locale], pathPrefix: `/${locale}`};
}

const LOCALE_SHAPE = /^\/([a-z]{2}-[a-z]{2})(?=\/|$)/i;
const SKIP =
  /^\/(assets|graphiql|subrequest-profiler|__|@|node_modules|\.well-known)(\/|$)|^\/account\/authorize\/?$|\.[a-z0-9]+$/i;

// 308 unprefixed URLs to the default locale and mixed-case prefixes to lowercase.
// Unknown prefixes (e.g. /zz-zz) fall through so the 404 guard handles them.
export function localeRedirect(request: Request): Response | null {
  // Checkout APIs are locale-free: skip the redirect.
  if (/^\/api\/checkout(-url$|-status$|\/)/.test(new URL(request.url).pathname)) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const {pathname} = url;
  if (pathname.endsWith('/__manifest')) return null;
  if (SKIP.test(pathname)) return null;
  const match = pathname.match(LOCALE_SHAPE);
  let target: string | null = null;
  if (match) {
    const lower = match[1].toLowerCase();
    if (match[1] !== lower && isEnabledLocale(lower)) {
      target = '/' + lower + pathname.slice(match[0].length);
    }
  } else {
    target = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
  }
  if (!target) return null;
  return new Response(null, {status: 308, headers: {Location: target + url.search}});
}
