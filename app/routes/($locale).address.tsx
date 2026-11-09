import {localePath} from '~/lib/locale-path';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {Form, redirect, useActionData, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).address';
import {
  ADDRESS_FIELDS,
  US_STATES,
  normalizePhone,
  normalizeState,
  type CheckoutAddress,
} from '~/components/checkout/address';
import {CheckoutSteps} from '~/components/checkout/steps';

type ActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<keyof CheckoutAddress, string>>;
};
const fail = (r: ActionResult): ActionResult => r;

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

  const fieldErrors: NonNullable<ActionResult['fieldErrors']> = {};
  for (const f of ADDRESS_FIELDS) {
    if (f.required && !address[f.name]) fieldErrors[f.name] = 'Required';
  }

  if (address.state) {
    const state = normalizeState(address.state);
    if (state) address.state = state;
    else fieldErrors.state = 'Please choose a state.';
  }

  if (address.phone) {
    const phone = normalizePhone(address.phone);
    if (phone.length === 10) address.phone = phone;
    else fieldErrors.phone = 'Enter a 10-digit US phone number.';
  }

  if (Object.keys(fieldErrors).length) {
    return fail({error: 'Please fix the highlighted fields.', fieldErrors});
  }

  if (!stripeCheckoutEnabled(context.env)) {
    // Shopify hosted checkout: save the address onto the Shopify cart so checkout opens prefilled.
    const state = address.state;
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
    if (problem) return fail({error: problem});
  }

  context.session.set('checkoutAddress', address);
  return redirect(localePath('/payment', params));
}

export default function Address() {
  const {address} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const fieldErrors = result?.fieldErrors ?? {};
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <CheckoutSteps current="Address" />
      <h1 className="mb-6 text-2xl font-semibold">Delivery address</h1>
      <Form method="post" className="space-y-4" noValidate={false}>
        {ADDRESS_FIELDS.map((f) => {
          const err = fieldErrors[f.name];
          const cls = `h-11 w-full rounded-md border px-3 ${err ? 'border-red-600' : 'border-neutral-300'}`;
          return (
            <label key={f.name} className="block space-y-1 text-sm">
              <span>{f.label}</span>
              {f.name === 'state' ? (
                <select
                  name="state"
                  required={f.required}
                  autoComplete={f.autoComplete}
                  defaultValue={address?.state ?? ''}
                  aria-invalid={err ? true : undefined}
                  className={`${cls} bg-white`}
                >
                  <option value="" disabled>Select a state</option>
                  {US_STATES.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  type={f.type ?? 'text'}
                  inputMode={f.name === 'phone' ? 'tel' : undefined}
                  required={f.required}
                  autoComplete={f.autoComplete}
                  defaultValue={address?.[f.name] ?? ''}
                  aria-invalid={err ? true : undefined}
                  className={cls}
                />
              )}
              {err ? <span className="block text-sm text-red-600">{err}</span> : null}
            </label>
          );
        })}
        {result?.error && !result.fieldErrors ? <p className="text-sm text-red-600">{result.error}</p> : null}
        <button type="submit" className="h-12 w-full rounded-md bg-black text-white">Continue to payment</button>
      </Form>
    </div>
  );
}
