import {forceCheckoutHost} from '~/lib/checkout-host';
import type {OptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {
  ConsentNote,
  SummaryDivider,
  SummaryItems,
  SummaryRow,
  TrustBox,
  type SummaryLine,
} from '~/components/checkout/checkout-shell';
import {CartCheckout} from './checkout';
import {DiscountForm} from './discount-form';
import {CartTotal} from './total';

function money(amount: string | number | undefined, currency: string | undefined) {
  if (amount === undefined || !currency) return undefined;
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(Number(amount));
}

export function cartSummaryLines(cart: OptimisticCart<CartApiQueryFragment | null> | null): SummaryLine[] {
  return (cart?.lines?.nodes ?? []).map((line) => ({
    id: line.id,
    title: line.merchandise?.product?.title ?? 'Item',
    qty: line.quantity,
    price: money(line.cost?.totalAmount?.amount, line.cost?.totalAmount?.currencyCode),
    image: line.merchandise?.image ?? null,
  }));
}

export function CartPageSummary({
  cart,
}: {
  cart: OptimisticCart<CartApiQueryFragment | null> | null;
}) {
  const hasLines = (cart?.lines?.nodes?.length ?? 0) > 0;
  if (!hasLines) return null;
  const currency = cart?.cost?.subtotalAmount?.currencyCode;
  return (
    <>
      <h2 id="cart-summary-heading" className="text-ds-medium font-semibold text-foreground">
        Summary
      </h2>
      <section
        aria-labelledby="cart-summary-heading"
        className="grid gap-4 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs"
      >
        <SummaryItems lines={cartSummaryLines(cart)} />
        <SummaryDivider />
        <SummaryRow label="Shipping" value="Free standard" positive />
        <SummaryRow label="Subtotal" value={money(cart?.cost?.subtotalAmount?.amount, currency) ?? '—'} />
        <SummaryRow label="Estimated taxes" value="Calculated at payment" />
        <SummaryDivider />
        <CartTotal cart={cart} />
        <CartCheckout checkoutUrl={forceCheckoutHost(cart?.checkoutUrl)} hasLines={hasLines} />
        <details className="group">
          <summary className="cursor-pointer list-none text-ds-small font-medium text-foreground underline underline-offset-2">
            Have a promo code?
          </summary>
          <div className="pt-3">
            <DiscountForm discountCodes={cart?.discountCodes ?? []} />
          </div>
        </details>
        <ConsentNote />
        <TrustBox />
      </section>
    </>
  );
}
