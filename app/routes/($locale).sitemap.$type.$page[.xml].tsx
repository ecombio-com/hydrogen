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
  const filtered = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
    const loc = /<loc>([^<]*)<\/loc>/.exec(block)?.[1] ?? '';
    const match = /\/(collections|pages)\/([^/?#]+)/.exec(loc);
    if (!match) return block;
    const [, kind, rawHandle] = match;
    const handle = decodeURIComponent(rawHandle);
    if (isOtherBrandHandle(handle, slug)) return '';
    if (kind === 'pages' && isHiddenPageHandle(handle)) return '';
    return block;
  });

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return new Response(filtered, {status: response.status, headers});
}