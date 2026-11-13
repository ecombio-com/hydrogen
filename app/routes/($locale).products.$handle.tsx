import {Await, redirect, useLoaderData} from 'react-router';
import {Suspense} from 'react';
import {ProductReviews, StarRating} from '~/@yotpo';
import {Money} from '@shopify/hydrogen';
import {DeliveryEstimate} from '~/components/product-detail/delivery-estimate';
import type {Route} from './+types/($locale).products.$handle';
import {brandNameFromMatches} from '~/lib/brand-meta';
import {getStorefrontConfig as getBrandConfig} from '~/lib/storefront-config';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {Breadcrumbs} from '~/components/product-detail/breadcrumbs';
import {BuyButtons} from '~/components/product-detail/buy-buttons';
import {AddedToCartScreen} from '~/components/cart/added-to-cart-screen';
import {FloatingBuyBlock} from '~/components/product-detail/floating-buy-block';
import {FrequentlyAskedQuestionsSection} from '~/components/product-detail/frequently-asked-questions-section';
import {PopularSearches} from '~/components/product-detail/popular-searches';
import {ProductHighlights} from '~/components/product-detail/product-highlights';
import {ProductFormOptions, toOptionGroups} from '~/components/product-detail/product-form';
import {ProductMedia} from '~/components/product-detail/product-media';
import {ProductPrice, ProductPriceStacked} from '~/components/product-detail/product-price';
import {WishlistButton} from '~/components/product-detail/wishlist-button';
import {ProductRecap} from '~/components/product-detail/product-recap';
// TEMP hidden: import {ProductResources} from '~/components/product-detail/product-resources';
import {RelatedArticlesSection} from '~/components/product-detail/related-articles-section';
import {PdpBanner} from '~/components/product-detail/pdp-banner';
import {ReassuranceBar} from '~/components/product-detail/reassurance-bar';
import {SpecCarousel} from '~/components/product-detail/spec-carousel';
import {StickyBuyBar} from '~/components/product-detail/sticky-buy-bar';
import {StepPicker} from '~/components/product-detail/step-picker';
import {fillUrlTemplate, parsePdpSteps, variantSubtitle} from '~/lib/pdp-steps';
import {TechnicalSpecsSection} from '~/components/product-detail/technical-specs-section';
import {getCollectionTrail} from '~/lib/breadcrumb-trail';
import {loadProductExtras} from '~/lib/product-extras.server';
import {PRODUCT_QUERY, VARIANT_URL_QUERY} from '~/lib/product-fragments';
import {
  getSelectedColorImage,
  getSharedImages,
  getTaggedGallery,
  hasAltTagging,
  hasColorImagePartitioning,
  toMedia,
} from '~/lib/product-media';
import specsCss from '~/styles/technical-specs.css?url';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {getLocaleFromRequest} from '~/lib/i18n';
import {parseDelivery, parsePopularSearches, parseSpecs, parseTrustBadges} from '~/lib/product';
import {loadCrossSell} from '~/lib/product-cross-sell';
import {FrequentlyBoughtTogether} from '~/components/product-detail/frequently-bought-together';
import {PairsWellWithSection} from '~/components/product-detail/pairs-well-with-section';
import {RelatedProductsSection} from '~/components/product/related-products-section';
import {TrackProductView} from '~/@algolia/components/track-product-view';
import {toPublicAlgoliaConfig} from '~/@algolia/config';

const COPY = {
  changeOptions: 'Change size or color',
  specsSubtitle: 'Full details in Technical Specifications below',
};

export const links = () => [{rel: 'stylesheet', href: specsCss}];

export const meta: Route.MetaFunction = ({data, matches}) => {
  const product = data?.product;
  if (!product) return [{title: 'Product not found'}];
  const vs = data.variantSeo;
  const brand = brandNameFromMatches(matches);
  const title = vs ? `${vs.title} | ${brand}` : product.seo?.title || product.title;
  const description = vs?.description || product.seo?.description || product.description || '';
  const url = data.canonicalUrl;
  const image = vs?.variant.image?.url ?? product.featuredImage?.url;
  const price = vs?.variant.price ?? product.priceRange.minVariantPrice;
  const inStock = vs ? vs.variant.availableForSale : product.availableForSale;
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'product'},
    {property: 'og:site_name', content: brandNameFromMatches(matches)},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    ...(image ? [{property: 'og:image', content: image}] : []),
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    ...(image ? [{name: 'twitter:image', content: image}] : []),
    {property: 'og:price:amount', content: price.amount},
    {property: 'og:price:currency', content: price.currencyCode},
    {property: 'og:availability', content: inStock ? 'instock' : 'oos'},
    {property: 'product:price:amount', content: price.amount},
    {property: 'product:price:currency', content: price.currencyCode},
    {property: 'product:availability', content: inStock ? 'in stock' : 'out of stock'},
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description,
        image: product.media.nodes.flatMap((m) =>
          'image' in m && m.image ? [m.image.url] : [],
        ),
        ...(product.vendor ? {brand: {'@type': 'Brand', name: product.vendor}} : {}),
        ...(data.rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: data.rating.value,
                reviewCount: data.rating.count,
              },
            }
          : {}),
        offers: vs
          ? {
              '@type': 'Offer',
              price: price.amount,
              priceCurrency: price.currencyCode,
              availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              itemCondition: 'https://schema.org/NewCondition',
              url,
              ...(vs.variant.sku ? {sku: vs.variant.sku} : {}),
            }
          : {
          '@type': 'AggregateOffer',
          priceCurrency: price.currencyCode,
          lowPrice: price.amount,
          highPrice: product.priceRange.maxVariantPrice.amount,
          offerCount: product.variantsCount?.count ?? 1,
          availability: inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url,
        },
        sku: product.id,
      },
    },
    {'script:ld+json': data.breadcrumbLd},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const productId = criticalData.product.id.split('/').pop() ?? '';
  const reviews = args.context.yotpo.getProductReviews(productId);
  const crossSell = loadCrossSell(args.context.storefront, criticalData.product.handle);
  const extras = loadProductExtras(args.context.storefront, criticalData.product.handle);
  const algolia = toPublicAlgoliaConfig(args.context.algolia.config);
  return {...deferredData, ...criticalData, reviews, crossSell, extras, algolia};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  let selectedOptions = getSelectedProductOptions(request);

  let [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  // Not a product handle? It may be a Back Market-style variant URL
  // (e.g. aventon-pace-4-large-step-through-blue-steel-electric-cruiser-bike).
  let variantSlug: string | null = null;
  if (!product?.id) {
    const cachedLookup = await storefront.query(VARIANT_URL_QUERY, {
      variables: {slug: handle},
      cache: storefront.CacheLong(),
    });
    const {metaobject} = cachedLookup.metaobject
      ? cachedLookup
      : await storefront.query(VARIANT_URL_QUERY, {
          variables: {slug: handle},
          cache: storefront.CacheNone(),
        });
    const baseHandle = metaobject?.product?.reference?.handle;
    let options: Record<string, string> | null = null;
    try {
      options = metaobject?.options?.value ? (JSON.parse(metaobject.options.value) as Record<string, string>) : null;
    } catch {
      options = null;
    }
    if (baseHandle && options) {
      variantSlug = handle;
      selectedOptions = Object.entries(options).map(([name, value]) => ({name, value}));
      ({product} = await storefront.query(PRODUCT_QUERY, {
        variables: {handle: baseHandle, selectedOptions},
      }));
    }
  }

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  if (!variantSlug) redirectIfHandleIsLocalized(request, {handle, data: product});

  const origin = new URL(request.url).origin;
  const prefix = getLocaleFromRequest(request).pathPrefix;
  const pdpSteps = parsePdpSteps(
    (product as {pdpSteps?: {value?: string | null} | null}).pdpSteps?.value,
  );

  // Products with a urlTemplate: old ?Size=&Color= links move (301) to the descriptive variant URL.
  if (pdpSteps?.urlTemplate && !variantSlug) {
    const url = new URL(request.url);
    const optionNames = new Set(product.options.map((o) => o.name));
    const hasOptionParams = [...url.searchParams.keys()].some((k) => optionNames.has(k));
    const selected = product.selectedOrFirstAvailableVariant?.selectedOptions;
    const slug = selected ? fillUrlTemplate(pdpSteps.urlTemplate, selected) : null;
    if (hasOptionParams && slug) {
      for (const k of optionNames) url.searchParams.delete(k);
      const rest = url.searchParams.toString();
      throw redirect(`${prefix}/products/${slug}${rest ? `?${rest}` : ''}`, 301);
    }
  }

  const trail = getCollectionTrail(product.collections.nodes);
  const crumbs = [
    {name: 'Home', path: '/'},
    ...trail.map((c) => ({name: c.title, path: `/collections/${c.handle}`})),
    // Back Market style: the last crumb is the short model name from the H1 ("iPhone 13 • Unlocked"),
    // and on a variant page it points at that variant page.
    {
      name: pdpSteps?.heading
        ? `${pdpSteps.heading.name}${pdpSteps.heading.tag ? ` \u2022 ${pdpSteps.heading.tag}` : ''}`
        : product.title,
      path: `/products/${variantSlug ?? product.handle}`,
    },
  ];
  const abs = (p: string) => `${origin}${prefix}${p === '/' ? '' : p}`;

  // Star rating for Google (Shopify's standard reviews.rating / reviews.rating_count fields).
  const r = product as {ratingValue?: {value?: string} | null; ratingCount?: {value?: string} | null};
  let rating: {value: number; count: number} | null = null;
  try {
    const value = Number((JSON.parse(r.ratingValue?.value ?? 'null') as {value?: unknown} | null)?.value);
    const count = Number(r.ratingCount?.value);
    if (value > 0 && count > 0) rating = {value, count};
  } catch {
    rating = null;
  }

  // Back Market-style snippet for a variant page: "Aventon Pace 4 Step-Through Large - Blue Steel - Class 2"
  const v = product.selectedOrFirstAvailableVariant;
  const variantSeo =
    variantSlug && v && pdpSteps?.heading
      ? (() => {
          const values = v.selectedOptions.map((o) => o.value).filter((x) => x !== 'Default Title');
          const name = [pdpSteps.heading.name, values.join(' - ')].join(' ');
          const title = pdpSteps.heading.tag ? `${name} - ${pdpSteps.heading.tag}` : name;
          const lead = `${pdpSteps.heading.name}${pdpSteps.heading.tag ? ` (${pdpSteps.heading.tag})` : ''} in ${values.join(', ')}.`;
          const description = `${lead} ${product.description}`.replace(/\s+/g, ' ').trim().slice(0, 155);
          return {title, description, variant: v};
        })()
      : null;

  return {
    // Variant pages (descriptive URL) are their own Google page; the plain URL is the model page.
    canonicalUrl: abs(`/products/${variantSlug ?? product.handle}`),
    variantSeo,
    rating,
    product,
    breadcrumbs: crumbs,
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{name: getBrandConfig(context.env.PUBLIC_STOREFRONT_ID).name, path: '/'}, ...crumbs.slice(1)].map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.path),
      })),
    },
    delivery: parseDelivery(product),
    popularSearches: parsePopularSearches(product.popularSearches),
    trustBadges: parseTrustBadges(product.trustBadges),
    specs: parseSpecs(product.specs),
    pdpSteps,




  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  return {};
}

export default function Product() {
  const {
    product,
    breadcrumbs,
    delivery,
    popularSearches,




    trustBadges,
    specs,
    pdpSteps,
    crossSell,
    extras,
    reviews,
    algolia,
  } = useLoaderData<typeof loader>();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );
  // Descriptive-URL products keep the address clean; others mirror options into ?Size=&Color=.
  useSelectedOptionInUrlParam(pdpSteps?.urlTemplate ? [] : selectedVariant.selectedOptions);
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;
  const {minVariantPrice: pMin, maxVariantPrice: pMax} = product.priceRange;
  const {minVariantPrice: cMin, maxVariantPrice: cMax} = product.compareAtPriceRange;
  const uniform =
    pMin.amount === pMax.amount &&
    pMin.currencyCode === pMax.currencyCode &&
    cMin.amount === cMax.amount;
  const hasOptions = productOptions.some((o) => o.optionValues.length > 1);

  // Color products show the selected color's image first and hide the other colors' images.
  const optionGroups = toOptionGroups(productOptions);
  const {images, videos} = toMedia(product.media.nodes);
  // Photos tagged in their alt text ("Title | Color: Blue") follow every option; otherwise only Color does.
  const tagged = hasAltTagging(images);
  const partitioned = !tagged && hasColorImagePartitioning(optionGroups);
  const mediaImages = tagged
    ? getTaggedGallery(images, selectedVariant?.selectedOptions ?? [], selectedVariant?.image)
    : partitioned
      ? getSharedImages(images, optionGroups)
      : images;
  const colorImage = partitioned
    ? getSelectedColorImage(optionGroups, [
        ...images,
        ...(selectedVariant?.image ? [selectedVariant.image] : []),
      ])
    : undefined;
  const heading = pdpSteps?.heading;
  const variantName = selectedVariant?.selectedOptions
    ?.map((o) => o.value)
    .filter((v) => v !== 'Default Title')
    .join(' / ');

  return (
    <Page className="pt-0">
      <Container className="bg-background pt-6 md:pt-8">
        <Sections>
          <Breadcrumbs items={breadcrumbs} className="pb-4 md:pb-6" />
          <div className="grid gap-ds-large lg:grid-cols-10 lg:items-start lg:gap-5">
            <ProductMedia
              images={mediaImages}
              videos={videos}
              colorImage={colorImage}
              title={title}
              className="lg:sticky lg:top-20 lg:col-span-6 lg:self-start"
            />
            <div className="grid gap-10 lg:col-span-4">
              {heading ? (
                <div className="grid gap-6" data-slot="product-info-bm">
                  <div>
                    <h1 className="flex flex-col gap-1">
                      <span className="text-ds-h3 font-semibold leading-tight text-foreground">
                        {heading.name}
                        {heading.tag ? <> &bull; {heading.tag}</> : null}
                      </span>
                      <span className="text-ds-regular font-normal text-foreground/80">
                        {variantSubtitle(selectedVariant?.selectedOptions, heading.subtitleOrder)}
                      </span>
                    </h1>
                    <div className="mt-2 min-h-5">
                      <Suspense fallback={<div className="h-5" aria-hidden />}>
                        <Await resolve={reviews} errorElement={<></>}>
                          {(data) => (
                            <StarRating
                              compact
                              summary={
                                data
                                  ? {
                                      averageScore: data.bottomline.average_score,
                                      totalReviews: data.bottomline.total_review,
                                    }
                                  : null
                              }
                            />
                          )}
                        </Await>
                      </Suspense>
                    </div>
                  </div>
                  <FloatingBuyBlock>
                    <div className="flex flex-wrap items-center gap-3">
                      {selectedVariant ? (
                        <ProductPriceStacked
                          className="grow"
                          amount={selectedVariant.price.amount}
                          currencyCode={selectedVariant.price.currencyCode}
                          compareAtAmount={selectedVariant.compareAtPrice?.amount}
                        />
                      ) : null}
                      <div className="flex min-w-0 grow items-center gap-3">
                        <div className="min-w-[164px] max-w-[256px] grow">
                          <BuyButtons
                            selectedVariant={selectedVariant}
                            availableForSale={product.availableForSale}
                            quantityPicker={false}
                          />
                        </div>
                        <WishlistButton productHandle={product.handle} />
                      </div>
                    </div>
                  </FloatingBuyBlock>
                  <DeliveryEstimate delivery={delivery} />
                </div>
              ) : (
              <div
                className="grid data-[uniform-price=true]:gap-10"
                data-uniform-price={uniform}
              >
                <div data-slot="product-info-header">
                  <h1 className="text-foreground text-ds-h3 font-semibold leading-tight">
                    {title}
                  </h1>
                  {product.vendor ? (
                    <p className="mt-ds-xxsmall text-ds-regular text-muted-foreground">
                      {product.vendor}
                    </p>
                  ) : null}
                  <div className="mt-ds-xsmall min-h-5">
                    <Suspense fallback={<div className="h-5" aria-hidden />}>
                      <Await resolve={reviews} errorElement={<></>}>
                        {(data) => (
                          <StarRating
                            summary={
                              data
                                ? {
                                    averageScore: data.bottomline.average_score,
                                    totalReviews: data.bottomline.total_review,
                                  }
                                : null
                            }
                          />
                        )}
                      </Await>
                    </Suspense>
                  </div>
                  {uniform ? (
                    <ProductPrice
                      amount={pMin.amount}
                      currencyCode={pMin.currencyCode}
                      compareAtAmount={cMin.amount}
                    />
                  ) : null}
                  <DeliveryEstimate delivery={delivery} />
                </div>
                <div className="grid gap-10">
                  {!uniform && selectedVariant ? (
                    <div data-slot="product-info-price">
                      <ProductPrice
                        amount={selectedVariant.price.amount}
                        currencyCode={selectedVariant.price.currencyCode}
                        compareAtAmount={selectedVariant.compareAtPrice?.amount}
                      />
                    </div>
                  ) : null}
                  {hasOptions && pdpSteps ? (
                    <a href="#pdp-steps" className="text-ds-regular underline">
                      {COPY.changeOptions}
                    </a>
                  ) : hasOptions ? (
                    <ProductFormOptions options={productOptions} />
                  ) : null}
                  <FloatingBuyBlock>
                    <BuyButtons
                      selectedVariant={selectedVariant}
                      availableForSale={product.availableForSale}
                    />
                  </FloatingBuyBlock>
                </div>
              </div>
              )}
              <ProductHighlights part="badges" badges={trustBadges} />
              <SpecCarousel specs={specs} subtitle={COPY.specsSubtitle} />
            </div>
          </div>

          {hasOptions && pdpSteps ? (
            <StepPicker
              selectedOptions={selectedVariant?.selectedOptions ?? []}
              config={pdpSteps}
              options={productOptions}
              images={[...(colorImage ? [colorImage] : []), ...mediaImages]}
              variantKey={selectedVariant?.id}
              title={title}
            />
          ) : null}

          {heading && pdpSteps ? (
            <ProductRecap
              name={`${heading.name}${heading.tag ? ` \u2022 ${heading.tag}` : ''}`}
              colorHex={
                productOptions
                  .find((o) => o.name === 'Color')
                  ?.optionValues.find((v) => v.selected)?.swatch?.color ?? null
              }
              chips={[
                ...(pdpSteps.recap?.chips ?? []),
                ...(selectedVariant?.selectedOptions ?? [])
                  .filter((o) => o.value !== 'Default Title')
                  .map((o) => o.value),
              ]}
              images={[...(colorImage ? [colorImage] : []), ...mediaImages]}
              selectedVariant={selectedVariant}
              availableForSale={product.availableForSale}
              delivery={delivery}
              recap={pdpSteps.recap}
              extras={extras}
            />
          ) : null}

          {/* Back Market layout: the recap block replaces the description for pdp_steps products. */}
          {descriptionHtml && !(heading && pdpSteps) ? (
            <div className="mt-ds-large grid gap-10 [&_*]:max-w-none">
              <div data-slot="product-info-description">
                <div
                  className="prose prose-sm text-foreground/80"
                  dangerouslySetInnerHTML={{__html: descriptionHtml}}
                />
              </div>
            </div>
          ) : null}

          {product.isGiftCard ? null : (
            <Suspense fallback={null}>
              <Await resolve={crossSell} errorElement={<></>}>
                {(data) => (
                  <>
                    {data.frequentlyBought.length > 0 && selectedVariant?.availableForSale ? (
                      <FrequentlyBoughtTogether
                        items={data.frequentlyBought}
                        main={{
                          imageUrl: selectedVariant.image?.url,
                          price: selectedVariant.price,
                          subtitle: variantName || undefined,
                          title: product.title,
                          variantId: selectedVariant.id,
                        }}
                      />
                    ) : null}
                    <RelatedProductsSection products={data.related} limit={4} />
                    <PairsWellWithSection products={data.complementary} />
                  </>
                )}
              </Await>
            </Suspense>
          )}
          <AddedToCartScreen
            crossSell={crossSell}
            item={{
              imageAlt: selectedVariant?.image?.altText ?? product.title,
              imageUrl: selectedVariant?.image?.url,
              subtitle: variantName || undefined,
              title: product.title,
            }}
          />
          <div id="reviews" className="scroll-mt-24">
            <Suspense fallback={<div className="min-h-64" aria-hidden />}>
              <Await resolve={reviews} errorElement={<></>}>
                {(data) => (
                  <ProductReviews
                    data={data}
                    handle={product.handle}
                    productTitle={product.title}
                  />
                )}
              </Await>
            </Suspense>
          </div>
          <Suspense fallback={null}><Await resolve={extras} errorElement={<></>}>{(x) => <FrequentlyAskedQuestionsSection html={x.faqBody} faq={x.faq} />}</Await></Suspense>
          <PopularSearches terms={popularSearches} />
          <Suspense fallback={null}><Await resolve={extras} errorElement={<></>}>{(x) => <TechnicalSpecsSection html={x.techSpecsBody} specs={x.specs} title={product.title} />}</Await></Suspense>
          {/* TEMP hidden: <Suspense fallback={null}><Await resolve={extras} errorElement={<></>}>{(x) => <ProductResources manualUrl={x.manualUrl} videoUrl={x.assemblyVideoUrl} />}</Await></Suspense> */}
          <Suspense fallback={null}><Await resolve={extras} errorElement={<></>}>{(x) => <RelatedArticlesSection articles={x.relatedArticles} />}</Await></Suspense>
          <Suspense fallback={null}><Await resolve={extras} errorElement={<></>}>{(x) => <PdpBanner banner={x.promoBanner} />}</Await></Suspense>
          <Suspense fallback={null}><Await resolve={extras} errorElement={<></>}>{(x) => <ReassuranceBar items={x.reassurance} />}</Await></Suspense>
        </Sections>
      </Container>

      {product.isGiftCard ? null : (
        <StickyBuyBar
          targetId="primary-buy-buttons"
          title={product.title}
          variantName={variantName}
          imageUrl={selectedVariant?.image?.url ?? product.featuredImage?.url}
          price={selectedVariant?.price ? <Money data={selectedVariant.price} /> : null}
        />
      )}
      <TrackProductView config={algolia} productId={product.id} />
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </Page>
  );
}
