import {forceCheckoutHost} from '~/lib/checkout-host';
const CART_CREATE = `#graphql
  mutation CheckoutSessionCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        cost {
          subtotalAmount { amount currencyCode }
          totalAmount { amount currencyCode }
        }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
` as const;

export type SessionInput = {
  storefront?: string;
  lines?: {variantId: string; quantity: number}[];
  discountCodes?: string[];
  email?: string;
};

type Env = Record<string, string | undefined>;
const list = (v?: string) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function allowedOrigins(env: Env) {
  return list(env.CHECKOUT_ALLOWED_ORIGINS);
}

export async function createCheckoutSession(
  storefront: {mutate: (q: string, o: {variables: Record<string, unknown>}) => Promise<any>},
  env: Env,
  input: SessionInput,
) {
  if (!input.storefront || !list(env.CHECKOUT_STOREFRONTS).includes(input.storefront)) {
    return {status: 400, body: {error: 'unknown storefront'}};
  }
  const lines = (input.lines ?? []).slice(0, 50).map((l) => ({
    merchandiseId: String(l.variantId).startsWith('gid://')
      ? String(l.variantId)
      : `gid://shopify/ProductVariant/${l.variantId}`,
    quantity: Math.min(99, Math.max(1, Math.floor(Number(l.quantity) || 0))),
  }));
  if (!lines.length) return {status: 400, body: {error: 'no lines'}};

  const {cartCreate} = await storefront.mutate(CART_CREATE, {
    variables: {
      input: {
        lines,
        attributes: [{key: 'storefront_id', value: input.storefront}],
        discountCodes: (input.discountCodes ?? []).slice(0, 5),
        ...(input.email ? {buyerIdentity: {email: input.email}} : {}),
      },
    },
  });
  const cart = cartCreate?.cart;
  if (!cart) return {status: 422, body: {error: cartCreate?.userErrors?.[0]?.message ?? 'cart failed'}};
  return {
    status: 200,
    body: {
      id: cart.id,
      next: {type: 'redirect', url: forceCheckoutHost(cart.checkoutUrl)},
      totals: cart.cost,
      discountCodes: cart.discountCodes,
    },
  };
}
