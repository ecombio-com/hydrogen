// One decision for every gate. Fails closed: only the exact string "true" turns the custom Stripe
// checkout on, and only when both Stripe keys exist. Anything else means Shopify's hosted checkout.
export function stripeCheckoutEnabled(env: object): boolean {
  const bag = env as Record<string, unknown>;
  const read = (key: string) => {
    const value = bag[key];
    return typeof value === 'string' ? value.trim().replace(/^["']|["']$/g, '') : '';
  };
  return (
    read('STRIPE_CHECKOUT_ENABLED') === 'true' &&
    read('STRIPE_SECRET_KEY') !== '' &&
    read('PUBLIC_STRIPE_PUBLISHABLE_KEY') !== ''
  );
}
