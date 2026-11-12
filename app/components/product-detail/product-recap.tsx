import {Image} from '@shopify/hydrogen';
import {cn} from 'cn';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Footprints,
  PlugZap,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {ProductFragment} from 'storefrontapi.generated';
import {PaymentIcons} from '~/components/footer/payment-icons';
import type {PdpRecap} from '~/lib/pdp-steps';
import {BuyButtons} from './buy-buttons';
import {DeliveryEstimate} from './delivery-estimate';
import {ProductPriceStacked} from './product-price';
import {RecapSheets} from './recap-sheets';
import type {ProductExtras} from '~/lib/product-extras.server';

const COPY = {
  prev: 'Previous image',
  next: 'Next image',
  show: (n: number) => `Show image ${n}`,
  comesWith: 'Comes with',
};

const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  shield: ShieldCheck,
  plug: PlugZap,
  charger: PlugZap,
  kickstand: Footprints,
};
const iconFor = (name?: string) => (name && ICONS[name]) || CircleCheck;

type Img = {url: string; altText?: string | null; width?: number | null; height?: number | null};
type Variant = ProductFragment['selectedOrFirstAvailableVariant'];

// Back Market "recap" block under the variant steps: gallery on the left, summary card on the
// right (name + chips + price + full-width Add to cart), then payment icons, delivery, info cards
// and "Comes with". Copy comes from pdp_steps.recap; price, stock and photos from the variant.
export function ProductRecap({
  name,
  colorHex,
  chips,
  images,
  selectedVariant,
  availableForSale,
  delivery,
  recap,
  extras,
}: {
  name: string;
  colorHex?: string | null;
  chips: string[];
  images: Img[];
  selectedVariant: Variant;
  availableForSale: boolean;
  delivery: Parameters<typeof DeliveryEstimate>[0]['delivery'];
  recap?: PdpRecap;
  extras: Promise<ProductExtras>;
}) {
  return (
    <section
      id="pdp-recap"
      className="grid gap-8 border-t border-border pt-ds-large md:flex md:items-start md:justify-center md:gap-8 lg:gap-16"
    >
      <ProductGallery images={images} alt={name} key={selectedVariant?.id} />
      <div className="grid gap-6 md:w-[360px] md:shrink-0 min-[900px]:w-[456px]">
        <div className="grid gap-3 rounded-ds-sm border border-foreground bg-card p-3 pt-6">
          <h2 className="text-ds-h4 font-semibold text-foreground">
            {name}
            {colorHex ? (
              <span
                aria-hidden
                className="ml-2 inline-block size-3 rounded-full align-middle"
                style={{background: colorHex}}
              />
            ) : null}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip} className="max-w-full">
                <span
                  title={chip}
                  className="inline-flex max-w-full items-center truncate rounded-sm border border-border px-1 text-ds-small font-semibold text-foreground"
                >
                  {chip}
                </span>
              </li>
            ))}
          </ul>
          {selectedVariant ? (
            <ProductPriceStacked
              amount={selectedVariant.price.amount}
              currencyCode={selectedVariant.price.currencyCode}
              compareAtAmount={selectedVariant.compareAtPrice?.amount}
            />
          ) : null}
          <BuyButtons
            selectedVariant={selectedVariant}
            availableForSale={availableForSale}
            quantityPicker={false}
          />
        </div>

        <PaymentIcons />

        <div className="grid gap-2 text-ds-regular">
          <div className="rounded-ds-md bg-muted p-3">
            <DeliveryEstimate delivery={delivery} />
          </div>
          {(recap?.infoCards ?? []).map((card) => {
            const Icon = iconFor(card.icon);
            const body = (
              <>
                <Icon aria-hidden className="size-6 shrink-0 md:size-8" />
                <span className="grid flex-1 text-left">
                  <span className="font-semibold text-foreground">{card.title}</span>
                  {card.subtitle ? (
                    <span className="text-ds-small text-muted-foreground">{card.subtitle}</span>
                  ) : null}
                </span>
                {card.href ? <ChevronRight aria-hidden className="size-6 shrink-0" /> : null}
              </>
            );
            const cls =
              'flex items-center gap-3 rounded-ds-md bg-muted p-3 transition-shadow hover:shadow-md';
            return card.href ? (
              <a key={card.title} href={card.href} className={cls}>
                {body}
              </a>
            ) : (
              <div key={card.title} className={cls}>
                {body}
              </div>
            );
          })}
        </div>

        {recap?.comesWith?.length ? (
          <div>
            <h3 className="mb-2 text-ds-regular text-foreground">{COPY.comesWith}</h3>
            <div className="flex flex-wrap gap-2">
              {recap.comesWith.map((item) => {
                const Icon = iconFor(item.icon);
                return (
                  <span
                    key={item.label}
                    className="flex h-9 max-w-full items-center gap-2 rounded-full bg-muted px-3 text-ds-regular text-foreground"
                  >
                    <Icon aria-hidden className="size-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        <RecapSheets name={name} extras={extras} />
      </div>
    </section>
  );
}

// Back Market gallery: big photo, round arrows, thumbnail strip. Used by the recap and every step.
export function ProductGallery({images, alt}: {images: Img[]; alt: string}) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [images[0]?.url]);
  if (!images.length) return null;
  const current = images[Math.min(index, images.length - 1)];
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div className="grid w-full gap-3 md:sticky md:top-20 md:max-w-[498px] md:min-w-[337px] md:grow">
      <div className="overflow-hidden rounded-ds-lg bg-muted">
        <Image
          data={current}
          alt={current.altText ?? alt}
          sizes="(max-width: 768px) 100vw, 466px"
          className="aspect-square w-full object-contain"
        />
      </div>
      {images.length > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label={COPY.prev}
            onClick={() => go(-1)}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <ul className="flex max-w-[280px] list-none gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
            {images.map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  aria-label={COPY.show(i + 1)}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  ref={(el) => {
                    // Keep the active thumbnail in view by scrolling only the strip, never the page.
                    const strip = el?.closest('ul');
                    if (el && strip && i === index) {
                      strip.scrollTo({left: el.offsetLeft - strip.clientWidth / 2, behavior: 'smooth'});
                    }
                  }}
                  className={cn(
                    'flex size-10 cursor-pointer overflow-hidden rounded-sm border bg-muted',
                    i === index ? 'border-foreground' : 'border-border opacity-50 hover:opacity-100',
                  )}
                >
                  <Image data={img} alt="" width={40} height={40} className="size-10 object-cover" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            aria-label={COPY.next}
            onClick={() => go(1)}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
      <p className="sr-only" role="status">
        {index + 1} / {images.length}
      </p>
    </div>
  );
}
