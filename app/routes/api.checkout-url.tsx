import {forceCheckoutHost} from '~/lib/checkout-host';
import type {LoaderFunctionArgs} from 'react-router';
import {STOREFRONT_ID} from '~/lib/storefront-id';

type CartAttributes = {attributes?: Array<{key: string; value?: string | null}>};

// Returns the current cart's Shopify checkoutUrl for Checkout Kit, after stamping the storefront id.
export async function loader({context}: LoaderFunctionArgs) {
  const headers = {'Cache-Control': 'no-store'};
  const env = context.env as unknown as Record<string, string | undefined>;
  if (env.CHECKOUT_KIT_ENABLED !== 'true') return Response.json({url: null}, {headers});
  const cart = await context.cart.get();
  if (!cart?.totalQuantity) return Response.json({url: null}, {headers});
  const stamped = (cart as CartAttributes).attributes?.some(
    (a) => a.key === 'storefront_id' && a.value === STOREFRONT_ID,
  );
  if (!stamped) await context.cart.updateAttributes([{key: 'storefront_id', value: STOREFRONT_ID}]);
  context.session.set('kitCheckoutStarted', true);
  return Response.json({url: forceCheckoutHost(cart.checkoutUrl)}, {headers});
}

