// Path: app/components/product-detail/pdp-banner.tsx
// Product page banner (custom.pdp_banner): white card, text left, image right. Hidden when empty.
import LocalizedLink from '~/components/ui/localized-link';
import {shopifyImageUrl} from '~/lib/image-url';
import type {PromoBanner} from '~/lib/product-extras.server';

export function PdpBanner({banner}: {banner: PromoBanner | null}) {
  if (!banner) return null;
  const {heading, body, buttonLabel, buttonUrl, image, mobileImage} = banner;

  return (
    <section
      aria-labelledby="pdp-banner-title"
      className="overflow-hidden rounded-ds-lg bg-white shadow-(--shadow-drop-xs)"
    >
      <div className={image ? 'grid md:grid-cols-[3fr_2fr] md:items-stretch' : 'grid'}>
        <div className="grid content-center gap-(--spacer-regular) p-(--spacer-large)">
          <h2 className="font-semibold text-ds-medium" id="pdp-banner-title">
            {heading}
          </h2>
          {body ? <p className="max-w-prose whitespace-pre-line text-ds-small">{body}</p> : null}
          {buttonLabel && buttonUrl ? (
            <LocalizedLink
              className="inline-flex h-11 w-fit items-center justify-center rounded-ds-md bg-foreground px-5 font-semibold text-background text-ds-small transition-opacity hover:opacity-90"
              href={buttonUrl}
            >
              {buttonLabel}
            </LocalizedLink>
          ) : null}
        </div>
        {image ? (
          <picture className="relative block aspect-3/2 md:aspect-auto md:min-h-64">
            {mobileImage ? (
              <source media="(max-width: 767px)" srcSet={shopifyImageUrl(mobileImage.url, 800)} />
            ) : null}
            <img
              alt={image.alt}
              className="absolute inset-0 size-full object-cover"
              decoding="async"
              height={image.height}
              loading="lazy"
              src={shopifyImageUrl(image.url, 1200)}
              width={image.width}
            />
          </picture>
        ) : null}
      </div>
    </section>
  );
}
