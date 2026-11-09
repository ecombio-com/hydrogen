import {localePath} from '~/lib/locale-path';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {Form, redirect, useActionData, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).address';
import {ADDRESS_FIELDS, type CheckoutAddress} from '~/components/checkout/address';
import {CheckoutSteps} from '~/components/checkout/steps';

// US numbers to E.164 (+1XXXXXXXXXX). Anything else is left off, so Shopify asks for it at payment.
function toE164(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}

export async function loader({context, params}: Route.LoaderArgs) {
  const cart = await context.cart.get();
  if (!cart?.totalQuantity) return redirect(localePath('/cart', params));
  if (!stripeCheckoutEnabled(context.env)) {
    await context.cart.updateAttributes([{key: 'storefront_id', value: getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).slug}]);
  }
  return {address: (context.session.get('checkoutAddress') as CheckoutAddress | undefined) ?? null};
}

export async function action({request, context, params}: Route.ActionArgs) {
  const form = await request.formData();
  const address = Object.fromEntries(
    ADDRESS_FIELDS.map((f) => [f.name, String(form.get(f.name) ?? '').trim()]),
  ) as CheckoutAddress;
  const missing = ADDRESS_FIELDS.filter((f) => f.required && !address[f.name]).map((f) => f.label);
  if (missing.length) return {error: `Please fill in: ${missing.join(', ')}`};

  if (!stripeCheckoutEnabled(context.env)) {
    // Shopify hosted checkout: save the address onto the Shopify cart so checkout opens prefilled.
    const state = address.state.toUpperCase();
    if (!/^[A-Z]{2}$/.test(state)) return {error: 'Please use the 2-letter state code, like CA.'};
    address.state = state;
    const phone = toE164(address.phone);
    const buyer = await context.cart.updateBuyerIdentity({email: address.email});
    const delivery = await context.cart.replaceDeliveryAddresses([
      {
        selected: true,
        address: {
          deliveryAddress: {
            firstName: address.firstName,
            lastName: address.lastName,
            address1: address.address1,
            ...(address.address2 ? {address2: address.address2} : {}),
            city: address.city,
            provinceCode: state,
            zip: address.zip,
            countryCode: 'US',
            ...(phone ? {phone} : {}),
          },
        },
      },
    ]);
    console.log('[address-debug] buyer', JSON.stringify(buyer).slice(0, 600));
    console.log('[address-debug] delivery', JSON.stringify(delivery).slice(0, 600));
    const problem = buyer.userErrors?.[0]?.message ?? delivery.userErrors?.[0]?.message;
    if (problem) return {error: problem};
  }

  context.session.set('checkoutAddress', address);
  return redirect(localePath('/payment', params));
}

export default function Address() {
  const {address} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <CheckoutSteps current="Address" />
      <h1 className="mb-6 text-2xl font-semibold">Delivery address</h1>
      <Form method="post" className="space-y-4">
        {ADDRESS_FIELDS.map((f) => (
          <label key={f.name} className="block space-y-1 text-sm">
            <span>{f.label}</span>
            <input
              name={f.name}
              type={f.type ?? 'text'}
              required={f.required}
              autoComplete={f.autoComplete}
              defaultValue={address?.[f.name] ?? ''}
              className="h-11 w-full rounded-md border border-neutral-300 px-3"
            />
          </label>
        ))}
        {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : null}
        <button type="submit" className="h-12 w-full rounded-md bg-black text-white">Continue to payment</button>
      </Form>
    </div>
  );
}

