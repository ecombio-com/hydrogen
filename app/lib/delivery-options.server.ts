// Shopify's real delivery options for the current cart (Storefront API).
// Used when Shopify takes the payment: the shopper picks a rate on /address,
// and Shopify checkout opens with that rate already selected.

type Money = {amount: string; currencyCode: string};

export type DeliveryOption = {
  handle: string;
  title: string | null;
  description: string | null;
  estimatedCost: Money;
  deliveryMethodType: string;
};

export type DeliveryGroup = {
  id: string;
  items: {id: string; title: string; quantity: number; image: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null}[];
  options: DeliveryOption[];
  selected: string | null;
};

type QueryResult = {
  cart: {
    deliveryGroups: {
      nodes: {
        id: string;
        cartLines: {nodes: {id: string; quantity: number; merchandise: {product?: {title: string}; image?: DeliveryGroup['items'][number]['image']}}[]};
        deliveryOptions: DeliveryOption[];
        selectedDeliveryOption: {handle: string} | null;
      }[];
    };
  } | null;
};

const CART_DELIVERY_QUERY = `
  query CartDeliveryOptions($cartId: ID!) {
    cart(id: $cartId) {
      deliveryGroups(first: 10) {
        nodes {
          id
          cartLines(first: 50) {
            nodes {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  product { title }
                  image { url altText width height }
                }
              }
            }
          }
          deliveryOptions {
            handle
            title
            description
            estimatedCost { amount currencyCode }
            deliveryMethodType
          }
          selectedDeliveryOption { handle }
        }
      }
    }
  }
`;

type StorefrontLike = {query: <T>(q: string, opts: {variables: Record<string, unknown>; cache?: unknown}) => Promise<T>};

export async function getDeliveryGroups(
  storefront: unknown,
  cartId: string | undefined,
): Promise<DeliveryGroup[]> {
  if (!cartId) return [];
  try {
    const sf = storefront as StorefrontLike & {CacheNone: () => unknown};
    const data = await sf.query<QueryResult>(CART_DELIVERY_QUERY, {
      variables: {cartId},
      cache: sf.CacheNone(),
    });
    return (data.cart?.deliveryGroups.nodes ?? []).map((g) => ({
      id: g.id,
      items: g.cartLines.nodes.map((l) => ({
        id: l.id,
        title: l.merchandise.product?.title ?? 'Item',
        quantity: l.quantity,
        image: l.merchandise.image ?? null,
      })),
      // Shipping only (no local pickup / delivery, which are off in admin).
      options: g.deliveryOptions.filter((o) => o.deliveryMethodType === 'SHIPPING'),
      selected: g.selectedDeliveryOption?.handle ?? null,
    }));
  } catch (error) {
    console.error('Could not load delivery options', error);
    return [];
  }
}

/** Sum of the selected (or cheapest) option per group, in dollars. */
export function shippingTotal(groups: DeliveryGroup[]): number | null {
  if (!groups.length) return null;
  let sum = 0;
  for (const g of groups) {
    const pick = g.options.find((o) => o.handle === g.selected);
    if (!pick) return null;
    sum += Number(pick.estimatedCost.amount);
  }
  return sum;
}
