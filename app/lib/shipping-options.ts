// Delivery choices shown on /address. Edit prices (cents) and delivery times here only.
// CONFIRM WITH VENDORS before launch: expedited must be something they can actually ship.
export const SHIPPING_OPTIONS = [
  {id: 'standard', title: 'Standard shipping', eta: '5–8 business days', cents: 0},
  {id: 'expedited', title: 'Expedited shipping', eta: '2–4 business days', cents: 4900},
] as const;

export type ShippingOption = (typeof SHIPPING_OPTIONS)[number];
export type ShippingId = ShippingOption['id'];

export function getShippingOption(id: unknown): ShippingOption {
  return SHIPPING_OPTIONS.find((o) => o.id === id) ?? SHIPPING_OPTIONS[0];
}

export function shippingLabel(cents: number) {
  return cents === 0 ? 'Free' : new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(cents / 100);
}
