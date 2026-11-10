import {localePath} from '~/lib/locale-path';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {Form, redirect, useActionData, useLoaderData, useNavigation} from 'react-router';
import {Truck, Zap} from 'lucide-react';
import {useState} from 'react';
import type {Route} from './+types/($locale).address';
import {
  ADDRESS_FIELDS,
  US_STATES,
  normalizePhone,
  normalizeState,
  type CheckoutAddress,
} from '~/components/checkout/address';
import {
  CheckoutCard,
  CheckoutProgress,
  CheckoutShell,
  ConsentNote,
  Perks,
  SummaryDivider,
  SummaryItems,
  SummaryRow,
  TrustBox,
  formatPhone,
  type SummaryLine,
} from '~/components/checkout/checkout-shell';
import {snapshotPrices} from '~/lib/price-watch';
import {SHIPPING_OPTIONS, getShippingOption, shippingLabel} from '~/lib/shipping-options';
import {EmptyCart} from '~/components/checkout/empty-cart';

type BillingAddress = Omit<CheckoutAddress, 'email' | 'phone'>;
const BILLING_FIELDS = ['firstName', 'lastName', 'address1', 'address2', 'city', 'state', 'zip'] as const;

type ActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};
const fail = (r: ActionResult): ActionResult => r;

// US numbers to E.164 (+1XXXXXXXXXX). Anything else is left off, so Shopify asks for it at payment.
function toE164(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(amount);
}

export async function loader({context, params}: Route.LoaderArgs) {
  const cart = await context.cart.get();
  if (!cart?.totalQuantity) return {empty: true as const};
  context.session.set('priceSnapshot', snapshotPrices(cart));
  if (!stripeCheckoutEnabled(context.env)) {
    await context.cart.updateAttributes([{key: 'storefront_id', value: getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).slug}]);
  }
  const currency = cart.cost.totalAmount.currencyCode;
  const lines: SummaryLine[] = cart.lines.nodes.map((l) => ({
    id: l.id,
    title: l.merchandise.product.title,
    qty: l.quantity,
    price: money(Number(l.cost.totalAmount.amount), currency),
    image: l.merchandise.image ?? null,
  }));
  return {
    address: (context.session.get('checkoutAddress') as CheckoutAddress | undefined) ?? null,
    billing: (context.session.get('checkoutBilling') as BillingAddress | undefined) ?? null,
    delivery: getShippingOption(context.session.get('deliveryMethod')).id,
    ownPayment: stripeCheckoutEnabled(context.env),
    baseAmount: Number(cart.cost.totalAmount.amount),
    currency,
    lines,
    subtotal: money(Number(cart.cost.subtotalAmount.amount), currency),
    total: money(Number(cart.cost.totalAmount.amount), currency),
  };
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

  // Billing: same as shipping unless the box is unticked.
  const sameBilling = form.get('sameBilling') === 'on';
  let billing: BillingAddress | null = null;
  if (!sameBilling) {
    billing = Object.fromEntries(
      BILLING_FIELDS.map((k) => [k, String(form.get(`billing_${k}`) ?? '').trim()]),
    ) as BillingAddress;
    for (const k of BILLING_FIELDS) {
      if (k !== 'address2' && !billing[k]) fieldErrors[`billing_${k}`] = 'Required';
    }
    if (billing.state) {
      const s = normalizeState(billing.state);
      if (s) billing.state = s;
      else fieldErrors.billing_state = 'Please choose a state.';
    }
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
    const problem = buyer.userErrors?.[0]?.message ?? delivery.userErrors?.[0]?.message;
    if (problem) return fail({error: problem});
  }

  context.session.set('checkoutAddress', address);
  context.session.set('deliveryMethod', getShippingOption(form.get('delivery')).id);
  if (billing) context.session.set('checkoutBilling', billing);
  else context.session.unset('checkoutBilling');
  return redirect(localePath('/payment', params));
}

/* ---------- UI ---------- */

const INPUT =
  'h-12 w-full rounded-ds-md border bg-background px-3 text-ds-regular text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10';

function Field({
  name,
  label,
  error,
  className,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {name: string; label: string; error?: string; hint?: string}) {
  return (
    <label className={`grid gap-1.5 text-ds-small ${className ?? ''}`}>
      <span className="font-medium text-foreground">
        {label}
        {input.required ? <span className="text-destructive"> *</span> : null}
      </span>
      <input name={name} aria-invalid={error ? true : undefined} className={`${INPUT} ${error ? 'border-destructive' : 'border-border'}`} {...input} />
      {hint && !error ? <span className="text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-destructive">{error}</span> : null}
    </label>
  );
}

function StateSelect({name, defaultValue, error}: {name: string; defaultValue?: string; error?: string}) {
  return (
    <label className="grid gap-1.5 text-ds-small">
      <span className="font-medium text-foreground">
        State<span className="text-destructive"> *</span>
      </span>
      <select
        name={name}
        required
        autoComplete={name === 'state' ? 'address-level1' : 'billing address-level1'}
        defaultValue={defaultValue ?? ''}
        aria-invalid={error ? true : undefined}
        className={`${INPUT} ${error ? 'border-destructive' : 'border-border'}`}
      >
        <option value="" disabled>
          Select a state
        </option>
        {US_STATES.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      {error ? <span className="text-destructive">{error}</span> : null}
    </label>
  );
}

function CountryField() {
  return (
    <label className="grid gap-1.5 text-ds-small">
      <span className="font-medium text-foreground">Country</span>
      <input value="United States" readOnly className={`${INPUT} border-border bg-muted text-muted-foreground`} />
    </label>
  );
}

export default function Address() {
  const data = useLoaderData<typeof loader>();
  if ('empty' in data) return <EmptyCart />;
  return <AddressView data={data} />;
}

function AddressView({data}: {data: Exclude<ReturnType<typeof useLoaderData<typeof loader>>, {empty: true}>}) {
  const {address, billing, lines, subtotal, delivery, baseAmount, currency, ownPayment} = data;
  const [deliveryId, setDeliveryId] = useState<string>(delivery);
  const chosen = getShippingOption(deliveryId);
  const estTotal = new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(baseAmount + chosen.cents / 100);
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const errs = result?.fieldErrors ?? {};
  const hasErrors = Object.keys(errs).length > 0;
  const [editing, setEditing] = useState(!address || hasErrors);
  const [sameBilling, setSameBilling] = useState(!billing);
  const a = address ?? undefined;

  return (
    <CheckoutShell
      aside={
        <>
          <h2 className="text-ds-medium font-semibold text-foreground">Your order</h2>
          <div className="grid gap-4 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs">
            <SummaryItems lines={lines} />
            <SummaryDivider />
            <SummaryRow label="Subtotal" value={subtotal} />
            {ownPayment ? (
              <SummaryRow label={chosen.title} value={shippingLabel(chosen.cents)} positive={chosen.cents === 0} />
            ) : (
              <SummaryRow label="Shipping" value="Calculated at payment" />
            )}
            <SummaryRow label="Estimated taxes" value="Calculated at payment" />
            <SummaryDivider />
            {ownPayment ? <SummaryRow label="Estimated total" value={estTotal} strong /> : null}
            <ConsentNote />
            <TrustBox />
          </div>
        </>
      }
      footerBar={
        <button form="address-form" type="submit" disabled={busy} className="h-12 w-full rounded-ds-md bg-foreground text-ds-regular font-semibold text-background disabled:opacity-60">
          {busy ? 'Saving…' : 'Continue to payment'}
        </button>
      }
    >
      <CheckoutProgress step="Address" backHref="/cart" />

      <Form id="address-form" method="post" className="grid gap-6">
        {/* ---- Shipping ---- */}
        <div className="grid gap-3">
          <h1 className="text-ds-regular font-semibold text-foreground">Shipping address</h1>
          {!editing && a ? (
            <CheckoutCard>
              <div className="flex items-start justify-between gap-3">
                <div className="text-ds-small leading-relaxed text-foreground">
                  <p className="font-semibold">
                    {a.firstName} {a.lastName}
                  </p>
                  <p>
                    {a.address1}
                    {a.address2 ? `, ${a.address2}` : ''}
                  </p>
                  <p>
                    {a.city}, {a.state} {a.zip}
                  </p>
                  <p>United States</p>
                  <p className="text-muted-foreground">{formatPhone(a.phone)}</p>
                  <p className="text-muted-foreground">{a.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="shrink-0 rounded-ds-md border border-foreground px-3 py-1.5 text-ds-small font-medium text-foreground hover:bg-muted"
                >
                  Edit address
                </button>
              </div>
              {/* Keep values posting while the card is collapsed */}
              {ADDRESS_FIELDS.map((f) => (
                <input key={f.name} type="hidden" name={f.name} value={a[f.name] ?? ''} />
              ))}
            </CheckoutCard>
          ) : (
            <CheckoutCard>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="email" type="email" label="Email" required autoComplete="email" defaultValue={a?.email} error={errs.email} className="sm:col-span-2" hint="For your order confirmation and receipt." />
                <Field name="firstName" label="First name" required autoComplete="given-name" defaultValue={a?.firstName} error={errs.firstName} />
                <Field name="lastName" label="Last name" required autoComplete="family-name" defaultValue={a?.lastName} error={errs.lastName} />
                <Field name="address1" label="Street address" required autoComplete="address-line1" defaultValue={a?.address1} error={errs.address1} className="sm:col-span-2" />
                <Field name="address2" label="Apt, suite, unit, or building" autoComplete="address-line2" defaultValue={a?.address2} className="sm:col-span-2" />
                <Field name="zip" label="ZIP code" required inputMode="numeric" autoComplete="postal-code" defaultValue={a?.zip} error={errs.zip} />
                <Field name="city" label="City" required autoComplete="address-level2" defaultValue={a?.city} error={errs.city} />
                <StateSelect name="state" defaultValue={a?.state} error={errs.state} />
                <CountryField />
                <Field name="phone" type="tel" label="Phone number" required inputMode="tel" autoComplete="tel" defaultValue={a?.phone} error={errs.phone} className="sm:col-span-2" hint="Just in case we need to reach you about delivery." />
              </div>
            </CheckoutCard>
          )}
        </div>

        {/* ---- Billing ---- */}
        <label className="flex cursor-pointer items-center gap-3 text-ds-small font-medium text-foreground">
          <input
            type="checkbox"
            name="sameBilling"
            checked={sameBilling}
            onChange={(e) => setSameBilling(e.target.checked)}
            className="size-4 accent-foreground"
          />
          Same shipping and billing address
        </label>

        {!sameBilling ? (
          <div className="grid gap-3">
            <h2 className="text-ds-regular font-semibold text-foreground">Billing address</h2>
            <CheckoutCard>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="billing_firstName" label="First name" required autoComplete="billing given-name" defaultValue={billing?.firstName} error={errs.billing_firstName} />
                <Field name="billing_lastName" label="Last name" required autoComplete="billing family-name" defaultValue={billing?.lastName} error={errs.billing_lastName} />
                <Field name="billing_address1" label="Street address" required autoComplete="billing address-line1" defaultValue={billing?.address1} error={errs.billing_address1} className="sm:col-span-2" />
                <Field name="billing_address2" label="Apt, suite, unit, or building" autoComplete="billing address-line2" defaultValue={billing?.address2} className="sm:col-span-2" />
                <Field name="billing_zip" label="ZIP code" required inputMode="numeric" autoComplete="billing postal-code" defaultValue={billing?.zip} error={errs.billing_zip} />
                <Field name="billing_city" label="City" required autoComplete="billing address-level2" defaultValue={billing?.city} error={errs.billing_city} />
                <StateSelect name="billing_state" defaultValue={billing?.state} error={errs.billing_state} />
                <CountryField />
              </div>
            </CheckoutCard>
          </div>
        ) : null}

        {/* ---- Delivery method (our own payment only; Shopify checkout picks shipping itself) ---- */}
        {ownPayment ? (
        <div className="grid gap-3">
          <h2 className="text-ds-regular font-semibold text-foreground">Select delivery method</h2>
          <CheckoutCard>
            <SummaryItems lines={lines.map((l) => ({...l, price: undefined}))} />
            <div role="radiogroup" aria-label="Delivery method" className="grid gap-3">
              {SHIPPING_OPTIONS.map((o) => {
                const on = deliveryId === o.id;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-ds-md p-4 transition-colors ${on ? 'border-2 border-foreground' : 'border border-border hover:border-foreground/40'}`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="delivery"
                        value={o.id}
                        checked={on}
                        onChange={() => setDeliveryId(o.id)}
                        className="size-4 accent-foreground"
                      />
                      <span className="grid">
                        <span className="text-ds-small font-semibold text-foreground">{o.title}</span>
                        <span className="flex items-center gap-1.5 text-ds-small text-muted-foreground">
                          {o.id === 'expedited' ? <Zap className="size-3.5" aria-hidden="true" /> : <Truck className="size-3.5" aria-hidden="true" />}
                          Arrives in {o.eta}
                        </span>
                      </span>
                    </span>
                    <span className={`text-ds-small font-semibold ${o.cents === 0 ? 'text-positive' : 'text-foreground'}`}>
                      {shippingLabel(o.cents)}
                    </span>
                  </label>
                );
              })}
            </div>
          </CheckoutCard>
        </div>
        ) : null}

        {result?.error ? (
          <p role="alert" className="rounded-ds-md bg-destructive/10 px-4 py-3 text-ds-small text-destructive">
            {result.error}
          </p>
        ) : null}

        <div className="hidden justify-end lg:flex">
          <button type="submit" disabled={busy} className="h-12 rounded-ds-md bg-foreground px-8 text-ds-regular font-semibold text-background hover:bg-foreground/90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Next'}
          </button>
        </div>
      </Form>

      <Perks />
    </CheckoutShell>
  );
}
