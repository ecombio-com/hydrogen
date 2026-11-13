import type {
  MediaImageData,
  MediaVideoData,
} from '~/components/product-detail/media-types';
import type {OptionGroupState} from '~/components/product-detail/types';

type MediaNodeLike = {
  mediaContentType: string;
  image?: MediaImageData | null;
  previewImage?: MediaImageData | null;
  sources?: ReadonlyArray<{url: string; mimeType: string}> | null;
};

// Splits Shopify media nodes into images and videos. Videos use the mp4 source when there is one.
export function toMedia(nodes: ReadonlyArray<MediaNodeLike>): {
  images: MediaImageData[];
  videos: MediaVideoData[];
} {
  const images: MediaImageData[] = [];
  const videos: MediaVideoData[] = [];
  for (const node of nodes) {
    if (node.mediaContentType === 'IMAGE' && node.image) {
      images.push(node.image);
    } else if (node.mediaContentType === 'VIDEO') {
      const sources = node.sources ?? [];
      const source = sources.find((s) => s.mimeType === 'video/mp4') ?? sources[0];
      if (source) videos.push({url: source.url, previewImage: node.previewImage ?? null});
    }
  }
  return {images, videos};
}

function findColorOption(options: OptionGroupState[]) {
  return options.find(
    (option) =>
      option.values.some((value) => value.swatch?.color || value.swatch?.image) ||
      option.name.toLowerCase().includes('color'),
  );
}

// Only color partitions the gallery; other option axes share imagery.
export function hasColorImagePartitioning(options: OptionGroupState[]): boolean {
  const color = findColorOption(options);
  if (!color || color.values.length <= 1) return false;
  return color.values.filter((value) => value.image).length > 1;
}

export function getSharedImages(
  images: MediaImageData[],
  options: OptionGroupState[],
): MediaImageData[] {
  const color = findColorOption(options);
  if (!color) return images;
  const colorUrls = new Set(
    color.values.map((value) => value.image).filter((url): url is string => Boolean(url)),
  );
  if (colorUrls.size === 0) return images;
  const shared = images.filter((image) => !colorUrls.has(image.url));
  return shared.length > 0 ? shared : images;
}

export function getSelectedColorImage(
  options: OptionGroupState[],
  images: MediaImageData[],
): MediaImageData | undefined {
  const color = findColorOption(options);
  const selected = color?.values.find((value) => value.selected);
  const url = selected?.image;
  if (!url) return undefined;
  return images.find((image) => image.url === url) ?? {url, altText: null, width: null, height: null};
}

// ---- Variant photos by alt-text tag (PDP-PLAYBOOK section 7) ----
// A photo whose alt is "<Title> | <Option>: <Value> | ..." belongs to the variants with those values.
// A photo with no tag is shared. Order: the variant's hero, then its tagged photos, then shared photos.
// Photos tagged for other values are hidden.
const TAG_SEP = ' | ';

function altTags(alt?: string | null): Record<string, string> | null {
  if (!alt || !alt.includes(TAG_SEP)) return null;
  const tags: Record<string, string> = {};
  for (const part of alt.split(TAG_SEP).slice(1)) {
    const i = part.indexOf(':');
    if (i > 0) tags[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim().toLowerCase();
  }
  return Object.keys(tags).length ? tags : null;
}

/** True when the product's photos use variant tags in their alt text. */
export function hasAltTagging(images: MediaImageData[]): boolean {
  return images.some((image) => altTags(image.altText) !== null);
}

const sameUrl = (a?: string | null, b?: string | null) =>
  Boolean(a && b) && a!.split('?')[0] === b!.split('?')[0];

export function getTaggedGallery(
  images: MediaImageData[],
  selectedOptions: ReadonlyArray<{name: string; value: string}>,
  variantImage?: MediaImageData | null,
): MediaImageData[] {
  const selected = new Map(selectedOptions.map((o) => [o.name.toLowerCase(), o.value.toLowerCase()]));
  const own: MediaImageData[] = [];
  const shared: MediaImageData[] = [];
  for (const image of images) {
    const tags = altTags(image.altText);
    if (!tags) shared.push(image);
    else if (Object.entries(tags).every(([k, v]) => !selected.has(k) || selected.get(k) === v)) own.push(image);
  }
  const hero = variantImage?.url
    ? images.find((image) => sameUrl(image.url, variantImage.url)) ?? variantImage
    : undefined;
  const rest = [...own, ...shared].filter((image) => !hero || !sameUrl(image.url, hero.url));
  const gallery = hero ? [hero, ...rest] : rest;
  return gallery.length ? gallery : images;
}
