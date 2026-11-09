import {forceCheckoutHost} from '~/lib/checkout-host';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {localePath} from '~/lib/locale-path';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {VERSIONS} from '~/lib/versions';
import {redirect, useLoaderData, useParams} from 'react-router';
import type {Route} from './+types/($locale).payment';
import type {CheckoutAddress} from '~/components/checkout/address';
import {CheckoutSteps} from '~/components/checkout/steps';
import {calculateTotals} from '~/lib/checkout-totals.server';
import {useEffect, useState, type ComponentType} from 'react';

type PaymentFormProps = {publishableKey: string; clientSecret: string; total: string};

function ClientPaymentForm(props: PaymentFormProps) {
  const [Form, setForm] = useState<ComponentType<PaymentFormProps> | null>(null);
  useEffect(() => {
    import('~/components/checkout/payment-form').then((m) => setForm(() => m.PaymentForm));
  }, []);
  if (!Form) return <div className="h-48 animate-pulse rounded-md bg-neutral-100" />;
  return <Form {...props} />;
}

async function stripe(env: Record<string, string>, path: string, body: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': VERSIONS.stripe},
    body,
  });
  return {ok: res.ok, data: (await res.json()) as {id?: string; client_secret?: string; status?: string; error?: {message: string}}};
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(cents / 100);
}

export async function loader({context, params}: Route.LoaderArgs) {
  const cart = await context.cart.get();
  if (!cart?.totalQuantity) return redirect(localePath('/cart', params));
  const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
  if (!address) return redirect(localePath('/address', params));

  const currency = cart.cost.totalAmount.currencyCode;
  const lineSum = cart.lines.nodes.reduce((s, l) => s + Math.round(Number(l.cost.totalAmount.amount) * 100), 0);
  const totalCents = Math.round(Number(cart.cost.totalAmount.amount) * 100);
  const discountCents = Math.max(0, lineSum - totalCents);
  const discount = discountCents ? '-' + money(discountCents, currency) : '';
  const lines = cart.lines.nodes.map((l) => ({id: l.id, title: l.merchandise.product.title, qty: l.quantity}));

  if (!stripeCheckoutEnabled(context.env)) {
    // Shopify hosted checkout: the Pay button opens Shopify checkout (Checkout Kit), already prefilled.
    return {
      mode: 'shopify' as const,
      checkoutUrl: forceCheckoutHost(cart.checkoutUrl),
      subtotal: money(lineSum, currency),
      discount,
      total: money(totalCents, currency),
      address,
      lines,
    };
  }

  const env = context.env as unknown as Record<string, string>;
  const linesMeta = cart.lines.nodes
    .map((l) => `${l.merchandise.id.split('/').pop()}x${l.quantity}`)
    .join(',');
  const totals = await calculateTotals(env, {
    discountCents,
    currency: currency.toLowerCase(),
    address,
    lines: cart.lines.nodes.map((l) => ({
      reference: l.merchandise.id,
      cents: Math.round(Number(l.cost.totalAmount.amount) * 100),
    })),
  });

  const body = new URLSearchParams({
    amount: String(totals.total),
    currency: currency.toLowerCase(),
    receipt_email: address.email,
    'metadata[cart_id]': cart.id,
    'metadata[storefront_id]': getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).slug,
    ...(linesMeta.length <= 5000 ? Object.fromEntries((linesMeta.match(/.{1,500}/g) ?? []).map((c, i) => [i === 0 ? 'metadata[lines]' : `metadata[lines_${i + 1}]`, c])) : {}),
    'metadata[shipping_cents]': String(totals.shipping),
    'metadata[tax_cents]': String(totals.tax),
    'metadata[discount_cents]': String(discountCents),
    'hooks[inputs][tax][calculation]': totals.calculationId,
    'shipping[name]': `${address.firstName} ${address.lastName}`,
    'shipping[phone]': address.phone,
    'shipping[address][line1]': address.address1,
    'shipping[address][line2]': address.address2,
    'shipping[address][city]': address.city,
    'shipping[address][state]': address.state,
    'shipping[address][postal_code]': address.zip,
    'shipping[address][country]': 'US',
  });

  const savedId = context.session.get('paymentIntentId') as string | undefined;
  let intent = savedId ? await stripe(env, `payment_intents/${savedId}`, body) : null;
  if (!intent?.ok || intent.data.status === 'succeeded') {
    body.set('automatic_payment_methods[enabled]', 'true');
    intent = await stripe(env, 'payment_intents', body);
  }
  if (!intent.ok || !intent.data.client_secret) {
    throw new Response(intent.data.error?.message ?? 'Stripe error', {status: 502});
  }
  context.session.set('paymentIntentId', intent.data.id);

  return {
    mode: 'stripe' as const,
    publishableKey: env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
    clientSecret: intent.data.client_secret,
    total: money(totals.total, currency),
    subtotal: money(totals.subtotal, currency),
    discount,
    shipping: totals.shipping === 0 ? 'Free' : money(totals.shipping, currency),
    tax: money(totals.tax, currency),
    address,
    lines,
  };
}

export default function Payment() {
  const d = useLoaderData<typeof loader>();
  const params = useParams();
  const {address, lines, subtotal, discount, total} = d;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <CheckoutSteps current="Payment" />
      <div className="grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-semibold">Ship to</p>
            <p>{address.firstName} {address.lastName}, {address.address1}{address.address2 ? `, ${address.address2}` : ''}, {address.city}, {address.state} {address.zip}</p>
            <a href={localePath('/address', params)} className="underline">Change</a>
          </div>
          {d.mode === 'stripe' ? (
            <ClientPaymentForm publishableKey={d.publishableKey} clientSecret={d.clientSecret} total={total} />
          ) : (
            <div className="space-y-3">
              <a href={d.checkoutUrl} data-checkout-kit className="flex h-12 w-full items-center justify-center rounded-md bg-black text-white">
                Continue to secure payment
              </a>
              <p className="text-xs text-neutral-500">
                Payment is processed securely by Shopify. Your address is already filled in. Shipping and tax are added on the next screen.
              </p>
            </div>
          )}
        </div>
        <aside className="space-y-3 rounded-lg bg-neutral-50 p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          {lines.map((l) => (<p key={l.id} className="text-sm">{l.qty} × {l.title}</p>))}
          <div className="space-y-1 border-t pt-3 text-sm">
            <p className="flex justify-between"><span>Subtotal</span><span>{subtotal}</span></p>
            {discount ? <p className="flex justify-between"><span>Discount</span><span>{discount}</span></p> : null}
            {d.mode === 'stripe' ? (
              <>
                <p className="flex justify-between"><span>Shipping</span><span>{d.shipping}</span></p>
                <p className="flex justify-between"><span>Tax</span><span>{d.tax}</span></p>
              </>
            ) : (
              <p className="flex justify-between"><span>Shipping and tax</span><span>Next step</span></p>
            )}
            <p className="flex justify-between border-t pt-2 font-semibold">
              <span>{d.mode === 'stripe' ? 'Total' : 'Total before shipping and tax'}</span><span>{total}</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
