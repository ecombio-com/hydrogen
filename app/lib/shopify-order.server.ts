import {getShippingOption} from '~/lib/shipping-options';
import {VERSIONS} from '~/lib/versions';
const API_VERSION = VERSIONS.shopifyAdmin;
export type Env = Record<string, string>;

export type Intent = {
  id: string;
  status?: string;
  amount?: number;
  currency?: string;
  created?: number;
  receipt_email?: string | null;
  metadata?: Record<string, string>;
  shipping?: {
    name?: string;
    phone?: string;
    address?: {line1?: string; line2?: string | null; city?: string; state?: string; postal_code?: string};
  };
  error?: {message: string};
};

export type Mailing = {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  countryCode: string;
  phone?: string;
};

export type OrderLine = {variantId: string; quantity: number; unitCents?: number};
type Made = {ok: true; orderName: string} | {ok: false; message: string};

export async function stripeCall(env: Env, path: string, body?: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': VERSIONS.stripe},
    body,
  });
  return (await res.json()) as Intent;
}

async function adminToken(env: Env) {
  const res = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_ADMIN_CLIENT_ID,
      client_secret: env.SHOPIFY_ADMIN_CLIENT_SECRET,
    }),
  });
  const json = (await res.json()) as {access_token?: string; error_description?: string; error?: string};
  if (!json.access_token) throw new Error(`Admin token failed: ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token;
}

async function adminFetch<T>(env: Env, token: string, query: string, variables: Record<string, unknown>) {
  const res = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query, variables}),
  });
  return (await res.json()) as T;
}

const ORDER_BY_TAG = `query($q: String!) { orders(first: 1, query: $q) { nodes { name } } }`;

const ORDER_CREATE = `
mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    order { id name }
    userErrors { field message }
  }
}`;

export function parseLines(raw?: string): OrderLine[] {
  return (raw ?? '')
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [id, rest = ''] = part.split('x');
      const [qty, cents] = rest.split('@');
      return {variantId: `gid://shopify/ProductVariant/${id}`, quantity: Number(qty), ...(cents ? {unitCents: Number(cents)} : {})};
    })
    .filter((l) => l.quantity > 0);
}

export function mailingFromIntent(pi: Intent): Mailing | null {
  const s = pi.shipping;
  const a = s?.address;
  if (!s?.name || !a?.line1 || !a.city || !a.state || !a.postal_code) return null;
  const [firstName, ...rest] = s.name.split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || '-',
    address1: a.line1,
    address2: a.line2 || undefined,
    city: a.city,
    province: a.state,
    zip: a.postal_code,
    countryCode: 'US',
    phone: s.phone || undefined,
  };
}

async function markIntent(env: Env, id: string, orderName: string) {
  await stripeCall(env, `payment_intents/${id}`, new URLSearchParams({'metadata[shopify_order_name]': orderName}));
}

export async function createPaidOrder(
  env: Env,
  pi: Intent,
  input: {email: string; mailing: Mailing; billing?: Mailing; lines: OrderLine[]},
): Promise<Made> {
  const cur = (pi.currency ?? 'usd').toUpperCase();
  const shipCents = Number(pi.metadata?.shipping_cents ?? 0);
  const taxCents = Number(pi.metadata?.tax_cents ?? 0);
  const discCents = Number(pi.metadata?.discount_cents ?? 0);
  const baseCents = (pi.amount ?? 0) - taxCents;
  const moneyBag = (c: number) => ({shopMoney: {amount: (c / 100).toFixed(2), currencyCode: cur}});
  const tag = `stripe_${pi.id}`;
  try {
    const token = await adminToken(env);
    const found = await adminFetch<{data?: {orders?: {nodes: {name: string}[]}}}>(env, token, ORDER_BY_TAG, {q: `tag:${tag}`});
    const existing = found.data?.orders?.nodes?.[0]?.name;
    if (existing) {
      await markIntent(env, pi.id, existing);
      return {ok: true, orderName: existing};
    }
    const json = await adminFetch<{
      data?: {orderCreate?: {order?: {name: string}; userErrors: {message: string}[]}};
      errors?: unknown;
    }>(env, token, ORDER_CREATE, {
      order: {
        email: input.email,
        currency: cur,
        tags: [tag, ...(pi.metadata?.storefront_id ? [`storefront_${pi.metadata.storefront_id}`] : [])],
        lineItems: input.lines.map((l) => ({variantId: l.variantId, quantity: l.quantity, ...(l.unitCents != null ? {priceSet: moneyBag(l.unitCents)} : {})})),
        shippingAddress: input.mailing,
        billingAddress: input.billing ?? input.mailing,
        // Link or create the Shopify customer, like a native checkout does.
        customer: {toUpsert: {email: input.email, firstName: input.mailing.firstName, lastName: input.mailing.lastName}},
        ...(input.mailing.phone ? {phone: input.mailing.phone.startsWith('+') ? input.mailing.phone : `+1${input.mailing.phone.replace(/\D/g, '')}`} : {}),
        customAttributes: pi.metadata?.storefront_id ? [{key: 'storefront', value: pi.metadata.storefront_id}] : [],
        shippingLines: [{title: getShippingOption(pi.metadata?.shipping_method).title, code: getShippingOption(pi.metadata?.shipping_method).id, priceSet: moneyBag(shipCents)}],
        taxesIncluded: false,
        taxLines: taxCents && baseCents > 0 ? [{title: 'Sales tax', rate: taxCents / baseCents, priceSet: moneyBag(taxCents)}] : [],
        discountCode: discCents ? {itemFixedDiscountCode: {code: 'Discount', amountSet: moneyBag(discCents)}} : undefined,
        financialStatus: 'PAID',
        note: `Paid with Stripe: ${pi.id}`,
        transactions: [{
          kind: 'SALE', status: 'SUCCESS', gateway: 'Stripe', authorizationCode: pi.id,
          amountSet: moneyBag(pi.amount ?? 0),
        }],
      },
      options: {inventoryBehaviour: 'DECREMENT_OBEYING_POLICY', sendReceipt: true},
    });
    const created = json.data?.orderCreate;
    if (!created?.order) {
      return {ok: false, message: created?.userErrors?.map((e) => e.message).join('; ') || JSON.stringify(json.errors ?? json)};
    }
    await markIntent(env, pi.id, created.order.name);
    return {ok: true, orderName: created.order.name};
  } catch (err) {
    return {ok: false, message: (err as Error).message};
  }
}


/** The lines that were actually charged, rebuilt from the PaymentIntent metadata. */
export function linesFromIntent(pi: Intent): OrderLine[] {
  return parseLines(Array.from({length: 10}, (_, i) => pi.metadata?.[i === 0 ? 'lines' : `lines_${i + 1}`] ?? '').join(''));
}
