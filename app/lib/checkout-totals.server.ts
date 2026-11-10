import {VERSIONS} from '~/lib/versions';
type Env = Record<string, string>;

// Free shipping for now. Change this one number (cents) or make it a function later.
export const SHIPPING_CENTS = 0;
const TAX_CODE_GOODS = 'txcd_99999999';

export type Totals = {subtotal: number; shipping: number; tax: number; total: number; calculationId: string};

export async function calculateTotals(
  env: Env,
  input: {
    currency: string;
    discountCents?: number;
    shippingCents?: number;
    address: {address1: string; city: string; state: string; zip: string};
    lines: {reference: string; cents: number}[];
  },
): Promise<Totals> {
  const gross = input.lines.reduce((s, l) => s + l.cents, 0);
  const off = Math.min(input.discountCents ?? 0, gross);
  let left = off;
  const lines = input.lines.map((l, i) => {
    const share = i === input.lines.length - 1 ? left : Math.round((off * l.cents) / (gross || 1));
    const take = Math.min(share, left, l.cents);
    left -= take;
    return {reference: l.reference, cents: l.cents - take};
  });
  const shippingCents = input.shippingCents ?? SHIPPING_CENTS;
  const body = new URLSearchParams({
    currency: input.currency,
    'customer_details[address][line1]': input.address.address1,
    'customer_details[address][city]': input.address.city,
    'customer_details[address][state]': input.address.state,
    'customer_details[address][postal_code]': input.address.zip,
    'customer_details[address][country]': 'US',
    'customer_details[address_source]': 'shipping',
    'shipping_cost[amount]': String(shippingCents),
  });
  lines.forEach((l, i) => {
    body.set(`line_items[${i}][amount]`, String(l.cents));
    body.set(`line_items[${i}][reference]`, l.reference);
    body.set(`line_items[${i}][tax_code]`, TAX_CODE_GOODS);
  });
  const res = await fetch('https://api.stripe.com/v1/tax/calculations', {
    method: 'POST',
    headers: {Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': VERSIONS.stripe},
    body,
  });
  const json = (await res.json()) as {id?: string; amount_total?: number; tax_amount_exclusive?: number; error?: {message: string}};
  if (!res.ok || !json.id) throw new Response(json.error?.message ?? 'Tax calculation failed', {status: 502});
  return {
    subtotal: input.lines.reduce((s, l) => s + l.cents, 0),
    shipping: shippingCents,
    tax: json.tax_amount_exclusive ?? 0,
    total: json.amount_total ?? 0,
    calculationId: json.id,
  };
}




