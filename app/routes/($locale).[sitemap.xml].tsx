import type {Route} from './+types/($locale).[sitemap.xml]';
import {getSitemapIndex} from '@shopify/hydrogen';
import {formatSitemapResponse} from '~/lib/sitemap-format';

export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemapIndex({
    storefront,
    request,
  });

  return formatSitemapResponse(response);
}
