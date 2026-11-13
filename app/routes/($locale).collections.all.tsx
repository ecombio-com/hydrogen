// Path: app/routes/($locale).collections.all.tsx
import {cn} from 'cn';
import {useLoaderData, useLocation, useNavigation} from 'react-router';
import type {Route} from './+types/($locale).collections.all';
import {InfiniteProductGrid} from '~/components/collections/infinite-product-grid';
import {SortSelect} from '~/components/collections/sort-select';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {brandNameFromMatches} from '~/lib/brand-meta';
import {PRODUCTS_PER_PAGE, parseBrowseParams, parseSortBy} from '~/lib/collection-browse';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/product-card';
import {withRatings} from '~/lib/ratings.server';

export const meta: Route.MetaFunction = ({data, matches}) => {
  const brand = brandNameFromMatches(matches);
  const title = `All products | ${brand}`;
  const description = `Browse every product from ${brand}: electric bikes, scooters, skateboards and accessories.`;
  return [
    {title},
    {name: 'description', content: description},
    ...(data?.canonicalUrl
      ? [{tagName: 'link', rel: 'canonical', href: data.canonicalUrl}]
      : []),
    {property: 'og:type', content: 'website'},
    {property: 'og:site_name', content: brand},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {name: 'twitter:card', content: 'summary_large_image'},
  ];
};

// The top-level `products` query uses ProductSortKeys, not the collection sort keys parseSortBy returns.
function toProductSortKey(key: string) {
  switch (key) {
    case 'CREATED':
      return 'CREATED_AT' as const;
    case 'PRICE':
      return 'PRICE' as const;
    case 'TITLE':
      return 'TITLE' as const;
    case 'ID':
      return 'ID' as const;
    default:
      return 'BEST_SELLING' as const; // MANUAL / COLLECTION_DEFAULT / BEST_SELLING
  }
}

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const {sortBy} = parseBrowseParams(url.searchParams);
  const {reverse, sortKey} = parseSortBy(sortBy);
  const cursor = url.searchParams.get('cursor');

  const {products} = await context.storefront.query(CATALOG_QUERY, {
    variables: {
      first: PRODUCTS_PER_PAGE,
      after: cursor,
      sortKey: toProductSortKey(String(sortKey)),
      reverse,
    },
  });

  return {
    canonicalUrl: `${url.origin}${url.pathname}`,
    pageInfo: products.pageInfo,
    products: await withRatings(context.yotpo, products.nodes),
  };
}

export default function CollectionAll() {
  const {pageInfo, products} = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigation = useNavigation();
  const pending =
    navigation.state === 'loading' && navigation.location?.pathname === location.pathname;

  return (
    <Page className="pt-2.5 pb-10 md:pt-10">
      <Container>
        <Sections className="gap-5">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-[56px] md:leading-[1.14]">
            All products
          </h1>

          <div className="sticky top-[calc(var(--header-offset,0px)_+_0.75rem)] z-20 flex items-center rounded-2xl border border-border-subtle bg-card px-4 py-3 [transition:var(--header-offset-transition,none)]">
            <div className="ml-auto">
              <SortSelect exclude={['best-selling']} />
            </div>
          </div>

          <div className={cn('min-w-0 transition-opacity duration-200', pending && 'pointer-events-none opacity-50')}>
            {products.length === 0 ? (
              <div className="py-10 text-center">
                <h2 className="mb-2 text-2xl">No products found</h2>
              </div>
            ) : (
              <InfiniteProductGrid
                key={location.search}
                initialProducts={products}
                initialPageInfo={pageInfo}
              />
            )}
          </div>
        </Sections>
      </Container>
    </Page>
  );
}

// Unused here. Kept until #13 Cleanup so codegen still emits CollectionItemFragment for ProductItem.tsx.
const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
  }
` as const;

const CATALOG_QUERY = `#graphql
  query Catalog(
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...ProductCardItem
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;