import type {Storefront} from '@shopify/hydrogen';

type Img = {url: string; altText?: string | null; width?: number | null; height?: number | null};
type Node = {
  url?: string | null;
  resource?: {image?: Img | null; products?: {nodes: {featuredImage?: Img | null}[]}} | null;
  items?: Node[];
};

const HANDLE_RX = /\/collections\/([^/?#]+)/;

/**
 * Menu items added as a pasted link come back with resource: null, so they have no image.
 * Look the collection up by the handle in its URL and attach it, so the tile can use
 * the collection image (or its first product's image).
 */
export async function fillMenuCollectionImages<T extends {items?: Node[]} | null | undefined>(
  storefront: Storefront,
  menu: T,
): Promise<T> {
  if (!menu?.items) return menu;

  const missing: {node: Node; handle: string}[] = [];
  const walk = (nodes: Node[] = []) => {
    for (const node of nodes) {
      const handle = !node.resource && node.url?.match(HANDLE_RX)?.[1];
      if (handle) missing.push({node, handle: decodeURIComponent(handle)});
      walk(node.items);
    }
  };
  walk(menu.items);
  if (!missing.length) return menu;

  const handles = [...new Set(missing.map((m) => m.handle))];
  const fields = handles
    .map(
      (h, i) =>
        `c${i}: collection(handle: ${JSON.stringify(h)}) { image { url altText width height } products(first: 1) { nodes { featuredImage { url altText width height } } } }`,
    )
    .join('\n');

  try {
    const data = (await storefront.query(`#graphql\n query MenuCollectionImages { ${fields} }`, {
      cache: storefront.CacheLong(),
    })) as Record<string, Node['resource']>;
    for (const m of missing) {
      const found = data[`c${handles.indexOf(m.handle)}`];
      if (found) m.node.resource = found;
    }
  } catch (error) {
    console.error('[menu-images]', error);
  }
  return menu;
}
