export interface TrailCollection {
  handle: string;
  title: string;
}

type ParentRef =
  | {reference?: {handle?: string; title?: string; parent?: ParentRef} | null}
  | null
  | undefined;

export type TrailSource = TrailCollection & {parent?: ParentRef};

const GENERIC = new Set(['all', 'frontpage', 'best-sellers']);
const MAX_DEPTH = 3;

// Longest custom.parent_collection chain (root first); ties keep Shopify's order.
// The product query selects parents three levels deep, so this makes no requests.
export function getCollectionTrail(collections: TrailSource[]): TrailCollection[] {
  let best: TrailCollection[] = [];
  for (const start of collections) {
    if (GENERIC.has(start.handle)) continue;
    const chain: TrailCollection[] = [{handle: start.handle, title: start.title}];
    const seen = new Set([start.handle]);
    let ref = start.parent?.reference;
    for (let i = 0; i < MAX_DEPTH && ref?.handle && !seen.has(ref.handle); i++) {
      seen.add(ref.handle);
      chain.unshift({handle: ref.handle, title: ref.title ?? ref.handle});
      ref = ref.parent?.reference;
    }
    if (chain.length > best.length) best = chain;
  }
  return best;
}
