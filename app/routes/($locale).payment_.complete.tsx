import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {data, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).payment_.complete';
import type {CheckoutAddress} from '~/components/checkout/address';
import {createPaidOrder, linesFromIntent, stripeCall, type Env} from '~/lib/shopify-order.server';
import {AlertTriangle, Check, Mail, Package, Truck} from 'lucide-react';
import LocalizedLink from '~/components/ui/localized-link';
import {CheckoutCard, CheckoutProgress, CheckoutShell, Perks} from '~/components/checkout/checkout-shell';

type Result = {ok: boolean; message?: string; orderName?: string; email?: string; firstName?: string};

// Pass the loader's Set-Cookie (new cart) through on normal page loads.
export const headers: Route.HeadersFunction = ({loaderHeaders}) => loaderHeaders;

export async function loader({request, context}: Route.LoaderArgs) {
  const env = context.env as unknown as Env;

  if (!stripeCheckoutEnabled(env)) {
    // Shopify hosted checkout: Checkout Kit sends the buyer here after Shopify creates the order.
    const kit = new URL(request.url).searchParams.get('kit') === '1';
    if (!kit || !context.session.get('kitCheckoutStarted')) return redirect('/cart');
    // Only confirm once Shopify has turned the cart into an order (the cart is gone).
    // One short retry covers the moment between payment and Shopify closing the cart.
    let open = await context.cart.get();
    if (open?.totalQuantity) {
      await new Promise((r) => setTimeout(r, 1500));
      open = await context.cart.get();
    }
    if (open?.totalQuantity) return redirect('/payment');
    context.session.unset('kitCheckoutStarted');
    const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
    context.session.unset('checkoutAddress');
    context.session.unset('checkoutBilling');
    context.session.unset('deliveryMethod');
    const fresh = await context.cart.create({});
    const headers = fresh.cart?.id ? context.cart.setCartId(fresh.cart.id) : undefined;
    return data({ok: true, email: address?.email, firstName: address?.firstName} satisfies Result, {headers});
  }

  const piId = new URL(request.url).searchParams.get('payment_intent');
  if (!piId) return redirect('/cart');

  // 1. Confirm with Stripe (never trust the URL alone)
  const pi = await stripeCall(env, `payment_intents/${piId}`);
  if (pi.status !== 'succeeded') {
    return {ok: false, message: `Payment not completed (status: ${pi.status ?? pi.error?.message ?? 'unknown'}).`} satisfies Result;
  }

  // 2. Already made the order? (page refresh or webhook) Show it, don't duplicate.
  if (pi.metadata?.shopify_order_name) {
    return {ok: true, orderName: pi.metadata.shopify_order_name, email: pi.receipt_email ?? undefined} satisfies Result;
  }

  // 3. Match payment to this cart
  const cart = await context.cart.get();
  const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
  if (!cart || cart.id !== pi.metadata?.cart_id || !address) {
    return {ok: false, message: 'Payment received, but the cart or address is missing. We will contact you.'} satisfies Result;
  }

  // 4. Create the paid order in Shopify (shared with the webhook)
  const made = await createPaidOrder(env, pi, {
    email: address.email,
    mailing: {
      firstName: address.firstName, lastName: address.lastName,
      address1: address.address1, address2: address.address2 || undefined,
      city: address.city, province: address.state, zip: address.zip,
      countryCode: 'US', phone: address.phone,
    },
    lines: linesFromIntent(pi),
  });
  if (!made.ok) {
    return {ok: false, message: `Payment received, but the order was not created: ${made.message}`} satisfies Result;
  }

  // 5. Clear checkout
  context.session.unset('checkoutAddress');
    context.session.unset('checkoutBilling');
    context.session.unset('deliveryMethod');
  context.session.unset('paymentIntentId');
  const fresh = await context.cart.create({});
  const headers = fresh.cart?.id ? context.cart.setCartId(fresh.cart.id) : undefined;

  return data({ok: true, orderName: made.orderName, email: address.email, firstName: address.firstName} satisfies Result, {headers});
}

export default function PaymentComplete() {
  const r = useLoaderData<typeof loader>() as Result;

  if (!r.ok) {
    return (
      <CheckoutShell>
        <div className="grid justify-items-center gap-4 rounded-ds-lg bg-background px-6 py-12 text-center shadow-ds-drop-xs">
          <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </span>
          <h1 className="text-ds-medium font-semibold">Something needs attention</h1>
          <p className="max-w-md text-ds-small text-muted-foreground">{r.message}</p>
          <LocalizedLink href="/pages/contact" className="rounded-ds-md border border-foreground px-5 py-2.5 text-ds-small font-medium hover:bg-muted">
            Contact us
          </LocalizedLink>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <CheckoutProgress step="Confirmation" />

      <section className="grid justify-items-center gap-3 rounded-ds-lg bg-background px-6 py-10 text-center shadow-ds-drop-xs">
        <span className="flex size-16 items-center justify-center rounded-full bg-positive text-white shadow-ds-drop-sm">
          <Check className="size-8" strokeWidth={3} aria-hidden="true" />
        </span>
        <h1 className="text-ds-h4 font-semibold text-foreground">
          {r.firstName ? `Thank you, ${r.firstName}!` : 'Thank you!'}
        </h1>
        <p className="text-ds-regular text-foreground">
          {r.orderName ? (
            <>
              Order <strong>{r.orderName}</strong> is confirmed.
            </>
          ) : (
            'Your order is confirmed.'
          )}
        </p>
        {r.email ? (
          <p className="flex items-center gap-1.5 text-ds-small text-muted-foreground">
            <Mail className="size-4" aria-hidden="true" />
            A receipt is on its way to {r.email}.
          </p>
        ) : null}
      </section>

      <CheckoutCard title="What happens next">
        <ol className="grid gap-4">
          {[
            {icon: Mail, title: 'Order confirmation', text: 'You will get an email with your order details shortly.', done: true},
            {icon: Package, title: 'Shipping update', text: 'We will email your tracking number as soon as your order ships.'},
            {icon: Truck, title: 'Delivery', text: 'Your order arrives with free standard shipping.'},
          ].map(({icon: Icon, title, text, done}, i) => (
            <li key={title} className="flex gap-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-positive/15 text-positive' : 'bg-muted text-muted-foreground'}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-ds-small font-semibold text-foreground">
                  {i + 1}. {title}
                </p>
                <p className="text-ds-small text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </CheckoutCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a href="/" className="flex h-12 items-center justify-center rounded-ds-md bg-foreground px-8 text-ds-regular font-semibold text-background hover:bg-foreground/90">
          Continue shopping
        </a>
        <LocalizedLink
          href="/pages/track-an-order"
          className="flex h-12 items-center justify-center rounded-ds-md border border-foreground bg-background px-8 text-ds-regular font-semibold text-foreground hover:bg-muted"
        >
          Track your order
        </LocalizedLink>
      </div>

      <Perks />
    </CheckoutShell>
  );
}
