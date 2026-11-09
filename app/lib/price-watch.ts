export type PriceSnapshot = Record<string, number>; // variant id -> unit price in cents

type CartLike = {
  lines: {
    nodes: {
      quantity: number;
      merchandise: {id: string; product: {title: string}};
      cost: {totalAmount: {amount: string}};
    }[];
  };
};

const unitCents = (l: CartLike['lines']['nodes'][number]) =>
  Math.round((Number(l.cost.totalAmount.amount) * 100) / Math.max(1, l.quantity));

export function snapshotPrices(cart: CartLike): PriceSnapshot {
  return Object.fromEntries(cart.lines.nodes.slice(0, 20).map((l) => [l.merchandise.id, unitCents(l)]));
}

/** Lines whose unit price differs from the snapshot. Quantity changes don't count. */
export function diffPrices(prev: PriceSnapshot, cart: CartLike) {
  const changes: {id: string; title: string; from: number; to: number}[] = [];
  for (const l of cart.lines.nodes) {
    const before = prev[l.merchandise.id];
    const after = unitCents(l);
    if (before !== undefined && before !== after) {
      changes.push({id: l.merchandise.id, title: l.merchandise.product.title, from: before, to: after});
    }
  }
  return changes;
}
