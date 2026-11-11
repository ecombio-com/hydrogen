import {forceCheckoutHost} from '~/lib/checkout-host';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {localePath} from '~/lib/locale-path';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {VERSIONS} from '~/lib/versions';
import {redirect, useLoaderData, useParams, useRevalidator} from 'react-router';
import {diffPrices, type PriceSnapshot} from '~/lib/price-watch';
import type {Route} from './+types/($locale).payment';
import type {CheckoutAddress} from '~/components/checkout/address';
import {ChevronDown, Tag} from 'lucide-react';
import {EmptyCart} from '~/components/checkout/empty-cart';
import {DiscountForm} from '~/components/cart/discount-form';
import {
  AddressBlock,
  CheckoutCard,
  CheckoutProgress,
  CheckoutShell,
  ConsentNote,
  Perks,
  SecureNote,
  SummaryDivider,
  SummaryItems,
  SummaryRow,
  TrustBox,
} from '~/components/checkout/checkout-shell';

import {calculateTotals} from '~/lib/checkout-totals.server';
import {getShippingOption} from '~/lib/shipping-options';
import {getDeliveryGroups, shippingTotal} from '~/lib/delivery-options.server';
import {useEffect, useState, type ComponentType} from 'react';

type BillingAddress = Omit<CheckoutAddress, 'email' | 'phone'>;

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
  if (!cart?.totalQuantity) return {empty: true as const};
  const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
  if (!address) return redirect(localePath('/address', params));

  const currency = cart.cost.totalAmount.currencyCode;
  const lineSum = cart.lines.nodes.reduce((s, l) => s + Math.round(Number(l.cost.totalAmount.amount) * 100), 0);
  const totalCents = Math.round(Number(cart.cost.totalAmount.amount) * 100);
  const discountCents = Math.max(0, lineSum - totalCents);
  const discount = discountCents ? '-' + money(discountCents, currency) : '';
  const lines = cart.lines.nodes.map((l) => ({id: l.id, title: l.merchandise.product.title, qty: l.quantity, price: money(Math.round(Number(l.cost.totalAmount.amount) * 100), currency), image: l.merchandise.image ?? null}));
  const billing = (context.session.get('checkoutBilling') as BillingAddress | undefined) ?? null;
  const discountCodes = cart.discountCodes ?? [];

  // Compare against the prices saved when the shopper was on the address step.
  const snapshot = context.session.get('priceSnapshot') as PriceSnapshot | undefined;
  const priceChanges = snapshot
    ? diffPrices(snapshot, cart).map((c) => ({...c, from: money(c.from, currency), to: money(c.to, currency)}))
    : [];

  if (!stripeCheckoutEnabled(context.env)) {
    // Shopify hosted checkout: the Pay button opens Shopify checkout (Checkout Kit), already prefilled.
    const shipDollars = shippingTotal(await getDeliveryGroups(context.storefront, cart.id));
    return {
      mode: 'shopify' as const,
      kitShipping: shipDollars == null ? null : shipDollars === 0 ? 'Free' : money(Math.round(shipDollars * 100), currency),
      kitEstimate: shipDollars == null ? null : money(totalCents + Math.round(shipDollars * 100), currency),
      checkoutUrl: forceCheckoutHost(cart.checkoutUrl),
      priceChanges,
      subtotal: money(lineSum, currency),
      discount,
      total: money(totalCents, currency),
      address,
      billing,
      discountCodes,
      lines,
    };
  }

  const env = context.env as unknown as Record<string, string>;
  const linesMeta = cart.lines.nodes
    .map((l) => `${l.merchandise.id.split('/').pop()}x${l.quantity}@${Math.round((Number(l.cost.totalAmount.amount) * 100) / Math.max(1, l.quantity))}`)
    .join(',');
  const delivery = getShippingOption(context.session.get('deliveryMethod'));
  const totals = await calculateTotals(env, {
    discountCents,
    shippingCents: delivery.cents,
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
    'metadata[shipping_method]': delivery.id,
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
    priceChanges,
    clientSecret: intent.data.client_secret,
    total: money(totals.total, currency),
    subtotal: money(totals.subtotal, currency),
    discount,
    shipping: totals.shipping === 0 ? 'Free' : money(totals.shipping, currency),
    shippingTitle: delivery.title,
    tax: money(totals.tax, currency),
    address,
    billing,
    discountCodes,
    lines,
  };
}

export default function Payment() {
  const data = useLoaderData<typeof loader>();
  if ('empty' in data) return <EmptyCart />;
  return <PaymentView d={data} />;
}

function PaymentView({d}: {d: Exclude<ReturnType<typeof useLoaderData<typeof loader>>, {empty: true}>}) {
  const params = useParams();
  const {address, billing, lines, subtotal, discount, total} = d;
  const {revalidate} = useRevalidator();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [revalidate]);
  const addressHref = localePath('/address', params);

  return (
    <CheckoutShell
      aside={
        <>
          <h2 className="text-ds-medium font-semibold text-foreground">Your order</h2>
          <div className="grid gap-4 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs">
            <SummaryItems lines={lines} />
            <SummaryDivider />
            <SummaryRow label="Subtotal" value={subtotal} />
            {discount ? <SummaryRow label="Discount" value={discount} positive /> : null}
            {d.mode === 'stripe' ? (
              <>
                <SummaryRow label={d.shippingTitle} value={d.shipping} positive={d.shipping === 'Free'} />
                <SummaryRow label="Tax" value={d.tax} />
              </>
            ) : (
              <>
                <SummaryRow label="Shipping" value={d.kitShipping ?? 'Next step'} positive={d.kitShipping === 'Free'} />
                <SummaryRow label="Tax" value="Calculated in secure payment" />
              </>
            )}
            <SummaryDivider />
            <SummaryRow
              label={d.mode === 'stripe' ? 'Total' : d.kitEstimate ? 'Total before tax' : 'Total before shipping and tax'}
              value={d.mode === 'stripe' ? total : d.kitEstimate ?? total}
              strong
            />
            <ConsentNote />
            <TrustBox />
          </div>
          <AddressBlock heading="Ship to" address={address} editHref={addressHref} />
          <AddressBlock heading="Bill to" address={billing ?? address} editHref={addressHref} />
        </>
      }
    >
      <CheckoutProgress step="Payment" backHref="/address" />

      {d.priceChanges.length ? (
        <div role="status" className="rounded-ds-lg border border-amber-300 bg-amber-50 p-4 text-ds-small">
          <p className="font-semibold">Price update</p>
          {d.priceChanges.map((c) => (
            <p key={c.id}>
              {c.title}: {c.from} → {c.to}
            </p>
          ))}
          <p className="mt-1">The total reflects the new price.</p>
        </div>
      ) : null}

      <div className="grid gap-3">
        <h1 className="text-ds-regular font-semibold text-foreground">Choose payment method</h1>
        <CheckoutCard>
          {d.mode === 'stripe' ? (
            <ClientPaymentForm publishableKey={d.publishableKey} clientSecret={d.clientSecret} total={total} />
          ) : (
            <div className="grid gap-3">
              <a
                href={d.checkoutUrl}
                data-checkout-kit
                className="flex h-12 w-full items-center justify-center rounded-ds-md bg-foreground text-ds-regular font-semibold text-background hover:bg-foreground/90"
              >
                Continue to secure payment
              </a>
              <SecureNote />
            </div>
          )}
        </CheckoutCard>
      </div>

      <details className="group rounded-ds-lg bg-background shadow-ds-drop-xs">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-ds-small font-medium text-foreground">
          <span className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-ds-md bg-positive/15 text-positive">
              <Tag className="size-4" aria-hidden="true" />
            </span>
            Have a promo code?
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-5 pb-5">
          <DiscountForm discountCodes={d.discountCodes} />
        </div>
      </details>

      <Perks />
    </CheckoutShell>
  );
}
