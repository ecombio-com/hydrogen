import type {LoaderFunctionArgs} from 'react-router';

// Called by Checkout Kit when the popup closes. Shopify drops a cart once its checkout becomes
// an order, so "checkout was started here + cart is gone" means the buyer paid.
export async function loader({context}: LoaderFunctionArgs) {
  const headers = {'Cache-Control': 'no-store'};
  if (!context.session.get('kitCheckoutStarted')) return Response.json({completed: false}, {headers});
  const cart = await context.cart.get();
  return Response.json({completed: !cart}, {headers});
}
