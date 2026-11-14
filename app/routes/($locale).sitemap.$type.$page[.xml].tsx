import type {Route} from './+types/($locale).sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {isHiddenPageHandle} from '~/lib/hidden-pages';
import {getStorefrontConfig, isOtherBrandHandle} from '~/lib/storefront-config';

export async function loader({request, params, context}: Route.LoaderArgs) {
  const {storefront} = context;
  const {slug} = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID);

  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: ['EN-US', 'EN-CA', 'FR-CA'],
    getLink: ({type, baseUrl, handle, locale}) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  // Drop entries this storefront must not list: other brands' collections/pages and hidden pages.
  const xml = await response.text();
  const stripped = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
    const loc = /<loc>([^<]*)<\/loc>/.exec(block)?.[1] ?? '';
    const match = /\/(collections|pages)\/([^/?#]+)/.exec(loc);
    if (!match) return block;
    const [, kind, rawHandle] = match;
    const handle = decodeURIComponent(rawHandle);
    if (isOtherBrandHandle(handle, slug)) return '';
    if (kind === 'pages' && isHiddenPageHandle(handle)) return '';
    return block;
  });

  const withVariants = await addVariantUrls(stripped, storefront);
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return new Response(withVariants, {status: response.status, headers});
}

const VARIANT_SLUGS_QUERY = `#graphql
  query VariantSlugs {
    metaobjects(type: "pdp_variant_url", first: 250) {
      nodes {
        handle
        product: field(key: "product") {
          reference {
            ... on Product {
              handle
            }
          }
        }
      }
    }
  }
`;

// Adds one <url> per variant_url entry by cloning its base product's <url> block (keeps locale prefix and hreflang).
async function addVariantUrls(xml: string, storefront: any): Promise<string> {
  try {
    const data: any = await storefront.query(VARIANT_SLUGS_QUERY, {cache: storefront.CacheShort()});
    const byBase = new Map<string, string[]>();
    for (const node of data?.metaobjects?.nodes ?? []) {
      const base = node?.product?.reference?.handle;
      if (!base || !node.handle) continue;
      byBase.set(base, [...(byBase.get(base) ?? []), node.handle]);
    }
    if (!byBase.size) return xml;
    const extra: string[] = [];
    for (const [block] of xml.matchAll(/<url>[\s\S]*?<\/url>/g)) {
      const loc = /<loc>([^<]*)<\/loc>/.exec(block)?.[1] ?? '';
      const m = /\/products\/([^/?#]+)$/.exec(loc);
      if (!m) continue;
      const base = decodeURIComponent(m[1]);
      const slugs = byBase.get(base);
      if (!slugs) continue;
      const pattern = new RegExp(`/products/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[<"?#/])`, 'g');
      for (const slug of slugs) extra.push(block.replace(pattern, `/products/${slug}`));
    }
    return extra.length ? xml.replace('</urlset>', `${extra.join('')}</urlset>`) : xml;
  } catch {
    return xml;
  }
}
