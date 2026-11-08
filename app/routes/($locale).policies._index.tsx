import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/($locale).policies._index';
import type {PoliciesQuery} from 'storefrontapi.generated';
import {getStorefrontConfig} from '~/lib/storefront-config';

type PolicyLink = {id: string; handle: string; title: string};

export async function loader({context}: Route.LoaderArgs) {
  const {slug} = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID);
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const byHandle = new Map<string, PolicyLink>();
  const shopPolicies = data.shop;
  for (const p of [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ]) {
    if (p) byHandle.set(p.handle, {id: p.id ?? p.handle, handle: p.handle, title: p.title});
  }

  // Subsidiaries: brand pages override (or add to) the store-level policies.
  if (slug !== 'ecombio') {
    const pages: any = await context.storefront.query(BRAND_POLICY_PAGES_QUERY, {
      variables: {
        privacy: `${slug}-privacy-policy`,
        refund: `${slug}-refund-policy`,
        shipping: `${slug}-shipping-policy`,
        terms: `${slug}-terms-of-service`,
        subscription: `${slug}-subscription-policy`,
      },
      cache: context.storefront.CacheLong(),
    });
    const brandPages: Array<[string, {id: string; title: string} | null | undefined]> = [
      ['privacy-policy', pages?.privacy],
      ['refund-policy', pages?.refund],
      ['shipping-policy', pages?.shipping],
      ['terms-of-service', pages?.terms],
      ['subscription-policy', pages?.subscription],
    ];
    for (const [handle, page] of brandPages) {
      if (page) byHandle.set(handle, {id: page.id, handle, title: page.title});
    }
  }

  const policies = [...byHandle.values()];
  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="policies">
      <h1>Policies</h1>
      <div>
        {policies.map((policy) => (
          <fieldset key={policy.id}>
            <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

const BRAND_POLICY_PAGES_QUERY = `#graphql
  query BrandPolicyPages(
    $privacy: String!
    $refund: String!
    $shipping: String!
    $terms: String!
    $subscription: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    privacy: page(handle: $privacy) { id title }
    refund: page(handle: $refund) { id title }
    shipping: page(handle: $shipping) { id title }
    terms: page(handle: $terms) { id title }
    subscription: page(handle: $subscription) { id title }
  }
` as const;

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;