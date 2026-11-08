import type {Storefront} from '@shopify/hydrogen';

export type ExpertReview = {
  title: string;
  videoUrl?: string;
  videoSources?: {url: string; mimeType: string}[];
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  viewCount?: string;
  sourceName?: string;
  sourceIconUrl?: string;
};

export type RelatedArticle = {
  id: string;
  handle: string;
  title: string;
  excerpt?: string;
  publishedAt: string;
  tags: string[];
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null};
  blog: {handle: string; title: string};
};

export type PromoImage = {url: string; width: number; height: number; alt: string};

export type PromoBanner = {
  heading: string;
  body?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  image?: PromoImage;
  mobileImage?: PromoImage;
};

export type ReassuranceItem = {icon: string; label: string};

export type ProductExtras = {
  faqBody: string | null;
  techSpecsBody: string | null;
  manualUrl: string | null;
  assemblyVideoUrl: string | null;
  expertReviews: ExpertReview[];
  relatedArticles: RelatedArticle[];
  promoBanner: PromoBanner | null;
  reassurance: ReassuranceItem[];
};

const EMPTY: ProductExtras = {
  faqBody: null,
  techSpecsBody: null,
  manualUrl: null,
  assemblyVideoUrl: null,
  expertReviews: [],
  relatedArticles: [],
  promoBanner: null,
  reassurance: [],
};

const PRODUCT_EXTRAS_QUERY = `#graphql
  query ProductExtras($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      faq: metafield(namespace: "custom", key: "frequently_asked_questions") {
        reference { ... on Page { body } }
      }
      techSpecs: metafield(namespace: "custom", key: "technical_specifications") {
        reference { ... on Page { body } }
      }
      ownersManual: metafield(namespace: "custom", key: "owners_manual") {
        reference { ... on GenericFile { url } }
      }
      assemblyVideo: metafield(namespace: "custom", key: "assembly_video") { value }
      expertReviews: metafield(namespace: "custom", key: "expert_reviews") {
        references(first: 20) {
          nodes {
            ... on Metaobject {
              fields {
                key
                value
                reference {
                  ... on MediaImage { image { url altText } }
                  ... on Video { previewImage { url } sources { url mimeType } }
                }
              }
            }
          }
        }
      }
      relatedArticles: metafield(namespace: "custom", key: "related_articles") {
        references(first: 10) {
          nodes {
            ... on Article {
              id
              handle
              title
              excerpt
              publishedAt
              tags
              image { url altText width height }
              blog { handle title }
            }
          }
        }
      }
      pdpBanner: metafield(namespace: "custom", key: "pdp_banner") {
        reference {
          ... on Metaobject {
            heading: field(key: "heading") { value }
            body: field(key: "body") { value }
            buttonLabel: field(key: "button_label") { value }
            buttonUrl: field(key: "button_url") { value }
            image: field(key: "image") { reference { ... on MediaImage { image { url width height altText } } } }
            mobileImage: field(key: "mobile_image") { reference { ... on MediaImage { image { url width height altText } } } }
          }
        }
      }
      reassurance: metafield(namespace: "custom", key: "reassurance") {
        references(first: 8) {
          nodes {
            ... on Metaobject {
              icon: field(key: "icon") { value }
              label: field(key: "label") { value }
            }
          }
        }
      }
    }
  }
` as const;

type Text = {value?: string | null} | null | undefined;
type ImageShape = {url: string; width?: number | null; height?: number | null; altText?: string | null};
type ImageField = {reference?: {image?: ImageShape | null} | null} | null | undefined;
type ReviewField = {
  key: string;
  value?: string | null;
  reference?: {
    image?: {url: string; altText?: string | null} | null;
    previewImage?: {url: string} | null;
    sources?: Array<{url: string; mimeType: string}> | null;
  } | null;
};

type ExtrasResult = {
  product?: {
    faq?: {reference?: {body?: string} | null} | null;
    techSpecs?: {reference?: {body?: string} | null} | null;
    ownersManual?: {reference?: {url?: string} | null} | null;
    assemblyVideo?: Text;
    expertReviews?: {references?: {nodes: Array<{fields?: ReviewField[]}>} | null} | null;
    relatedArticles?: {references?: {nodes: Array<Partial<RelatedArticle> & {excerpt?: string | null; image?: RelatedArticle['image'] | null}>} | null} | null;
    pdpBanner?: {
      reference?: {
        heading?: Text;
        body?: Text;
        buttonLabel?: Text;
        buttonUrl?: Text;
        image?: ImageField;
        mobileImage?: ImageField;
      } | null;
    } | null;
    reassurance?: {references?: {nodes: Array<{icon?: Text; label?: Text} | null>} | null} | null;
  } | null;
};

const text = (field: Text) => field?.value?.trim() || undefined;

function toPromoImage(field: ImageField): PromoImage | undefined {
  const image = field?.reference?.image;
  if (!image?.url) return undefined;
  return {url: image.url, width: image.width ?? 1200, height: image.height ?? 800, alt: image.altText ?? ''};
}

function toExpertReviews(nodes: Array<{fields?: ReviewField[]}>): ExpertReview[] {
  const reviews: ExpertReview[] = [];
  for (const node of nodes) {
    const f = Object.fromEntries((node.fields ?? []).map((field) => [field.key, field]));
    const title = f.title?.value;
    if (!title) continue;
    const videoUrl = f.video_url?.value || undefined;
    const videoSources = (f.video?.reference?.sources ?? []).filter((s) => s.mimeType.startsWith('video/'));
    if (!videoUrl && videoSources.length === 0) continue;
    const thumb = f.thumbnail?.reference;
    reviews.push({
      title,
      videoUrl,
      videoSources: videoSources.length ? videoSources : undefined,
      thumbnailUrl: thumb?.image?.url ?? f.video?.reference?.previewImage?.url,
      thumbnailAlt: thumb?.image?.altText ?? title,
      viewCount: f.view_count?.value || undefined,
      sourceName: f.source_name?.value || undefined,
      sourceIconUrl: f.source_icon?.reference?.image?.url,
    });
  }
  return reviews;
}

// Below-the-fold PDP content in one long-cached query. Never throws: each section just hides.
export async function loadProductExtras(storefront: Storefront, handle: string): Promise<ProductExtras> {
  try {
    const data = (await storefront.query(PRODUCT_EXTRAS_QUERY, {
      variables: {handle},
      cache: storefront.CacheLong(),
    })) as unknown as ExtrasResult;
    const p = data.product;
    if (!p) return EMPTY;

    const banner = p.pdpBanner?.reference;
    const heading = text(banner?.heading);

    return {
      faqBody: p.faq?.reference?.body ?? null,
      techSpecsBody: p.techSpecs?.reference?.body ?? null,
      manualUrl: p.ownersManual?.reference?.url ?? null,
      assemblyVideoUrl: text(p.assemblyVideo) ?? null,
      expertReviews: toExpertReviews(p.expertReviews?.references?.nodes ?? []),
      relatedArticles: (p.relatedArticles?.references?.nodes ?? []).flatMap((a) =>
        a?.id && a.handle && a.title && a.blog
          ? [{
              id: a.id,
              handle: a.handle,
              title: a.title,
              excerpt: a.excerpt ?? undefined,
              publishedAt: a.publishedAt ?? '',
              tags: a.tags ?? [],
              image: a.image ?? undefined,
              blog: a.blog,
            }]
          : [],
      ),
      promoBanner:
        banner && heading
          ? {
              heading,
              body: text(banner.body),
              buttonLabel: text(banner.buttonLabel),
              buttonUrl: text(banner.buttonUrl),
              image: toPromoImage(banner.image),
              mobileImage: toPromoImage(banner.mobileImage),
            }
          : null,
      reassurance: (p.reassurance?.references?.nodes ?? []).flatMap((n) => {
        const label = text(n?.label);
        const icon = text(n?.icon);
        return label && icon ? [{icon, label}] : [];
      }),
    };
  } catch {
    return EMPTY;
  }
}
