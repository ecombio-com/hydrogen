import {getSeoMeta} from '@shopify/hydrogen';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).policies.$handle';
import {RichTextPage} from '~/components/content/rich-text-page';
import {getStorefrontConfig} from '~/lib/storefront-config';

export const meta: Route.MetaFunction = ({data}) =>
  data ? (getSeoMeta({title: data.policy.title, url: data.canonical}) ?? []) : [];

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Response('Not Found', {status: 404});

  const url = new URL(request.url);
  const canonical = `${url.origin}${url.pathname}`;
  const {slug} = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID);

  // Subsidiaries: prefer the brand's own Shopify Page (e.g. scooterbio-privacy-policy).
  // If it doesn't exist (or isn't published) we fall back to the store-level policy below.
  if (slug !== 'ecombio') {
    const {page} = await context.storefront.query(BRAND_POLICY_PAGE_QUERY, {
      variables: {handle: `${slug}-${handle}`},
      cache: context.storefront.CacheLong(),
    });
    if (page) {
      return {policy: {body: page.body, handle, title: page.title}, canonical};
    }
  }

  const {shop} = await context.storefront.query(SHOP_POLICIES_QUERY, {
    cache: context.storefront.CacheLong(),
  });

  // Same lookup as Next: gather every policy that exists, match on handle.
  const policy = Object.values(shop ?? {}).find(
    (p): p is {body: string; handle: string; title: string} =>
      typeof p === 'object' && p !== null && 'handle' in p && p.handle === handle,
  );
  if (!policy) throw new Response('Not Found', {status: 404});

  return {
    policy: {body: policy.body, handle: policy.handle, title: policy.title},
    canonical,
  };
}

export default function PolicyPage() {
  const {policy} = useLoaderData<typeof loader>();
  return <RichTextPage body={policy.body} title={policy.title} />;
}

const BRAND_POLICY_PAGE_QUERY = `#graphql
  query BrandPolicyPage($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    page(handle: $handle) {
      handle
      title
      body
    }
  }
` as const;

const SHOP_POLICIES_QUERY = `#graphql
  fragment ShopPolicyFields on ShopPolicy {
    body
    handle
    title
  }
  query ShopPolicies($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      contactInformation { ...ShopPolicyFields }
      legalNotice { ...ShopPolicyFields }
      privacyPolicy { ...ShopPolicyFields }
      refundPolicy { ...ShopPolicyFields }
      shippingPolicy { ...ShopPolicyFields }
      termsOfSale { ...ShopPolicyFields }
      termsOfService { ...ShopPolicyFields }
    }
  }
` as const;