import {Image, Money, type MappedProductOptions} from '@shopify/hydrogen';
import {cn} from 'cn';
import {useState} from 'react';
import LocalizedLink from '~/components/ui/localized-link';
import {ProductGallery} from './product-recap';
import {fillUrlTemplate, formatHeight, type PdpStep, type PdpSteps} from '~/lib/pdp-steps';

const COPY = {
  soldOut: 'Sold out',
  heightLabel: "What's your height?",
  heightPlaceholder: 'Pick your height',
  recommended: 'Recommended for you',
  noFit: 'No size fits that height. Check the rider height ranges above.',
};

type OptionValue = MappedProductOptions['optionValues'][number];
type Img = {url: string; altText?: string | null; width?: number | null; height?: number | null};

// Back Market-style stepped picker: one full-width section per option, photo on the left,
// option rows on the right. Every row shows its own price; sold-out rows stay visible but grayed.
export function StepPicker({
  selectedOptions,
  config,
  options,
  images,
  variantKey,
  title,
}: {
  selectedOptions: {name: string; value: string}[];
  config: PdpSteps;
  options: MappedProductOptions[];
  images: Img[];
  variantKey?: string;
  title: string;
}) {
  const sections = config.steps
    .map((step) => ({step, option: options.find((o) => o.name === step.option)}))
    .filter((s): s is {step: PdpStep; option: MappedProductOptions} => !!s.option);
  if (!sections.length) return null;

  return (
    <div id="pdp-steps" className="grid gap-ds-large scroll-mt-24">
      {sections.map(({step, option}) => (
        <section
          key={step.option}
          aria-label={step.title}
          id={`pick-${step.option.toLowerCase().replace(/\s+/g, '-')}`}
          className="flex flex-col border-t border-border py-8 md:flex-row md:items-center md:justify-center md:py-6"
        >
          {/* Phones: heading above the gallery (Back Market order). Desktop: heading in the right column. */}
          <h2
            id={`heading-${step.option.toLowerCase().replace(/\s+/g, '-')}`}
            className="mb-4 text-ds-h3 font-semibold text-foreground md:hidden"
          >
            {step.title}
          </h2>
          <div className="mb-4 max-w-full md:mr-8 md:mb-0 md:max-w-[498px] md:min-w-[337px] md:grow lg:mr-16">
            <ProductGallery images={images} alt={title} key={variantKey} />
          </div>
          <div className="grid gap-3 md:w-[360px] md:shrink-0 min-[900px]:w-[456px]">
            <h2 aria-hidden className="hidden text-ds-h3 font-semibold text-foreground md:block">
              {step.title}
            </h2>
            <ul
              role="radiogroup"
              aria-label={step.title}
              className="grid list-none grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2"
            >
              {option.optionValues.map((value) => (
                <li key={value.name}>
                  <StepCard
                    step={step}
                    value={value}
                    href={variantHref(config, selectedOptions, step.option, value)}
                  />
                </li>
              ))}
            </ul>
            {step.heightHelper ? <HeightHelper step={step} /> : null}
          </div>
        </section>
      ))}
    </div>
  );
}

// Descriptive URL when the product has a urlTemplate (built from the current pick + this value,
// so it is right even while the next page is still loading); otherwise ?Size=&Color=.
function variantHref(
  config: PdpSteps,
  selected: {name: string; value: string}[],
  option: string,
  value: OptionValue,
) {
  if (value.isDifferentProduct) return `/products/${value.handle}?${value.variantUriQuery}`;
  if (config.urlTemplate) {
    const next = [...selected.filter((o) => o.name !== option), {name: option, value: value.name}];
    const slug = fillUrlTemplate(config.urlTemplate, next);
    if (slug) return `/products/${slug}`;
  }
  return `?${value.variantUriQuery}`;
}

// Back Market option card: color dot (or variant photo), name, helper line, price under it.
// Selected = light tint + dark border. Sold out stays visible, grayed, "Sold out" instead of price.
function StepCard({step, value, href}: {step: PdpStep; value: OptionValue; href: string}) {
  const variant = value.variant ?? value.firstSelectableVariant;
  const meta = step.values?.[value.name];
  const hex = meta?.swatch ?? value.swatch?.color ?? null;
  const thumb = !hex && step.swatch === 'variantImage' ? value.firstSelectableVariant?.image : null;
  const disabled = !value.exists || !value.available;

  const body = (
    <span className="flex w-full flex-row items-start pr-4 pl-2">
      {hex ? (
        <span
          aria-hidden
          className="m-0.5 mt-1 size-4 shrink-0 rounded-full border border-black/15"
          style={{background: hex}}
        />
      ) : thumb?.url ? (
        <Image
          data={thumb}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-sm bg-muted object-contain"
        />
      ) : null}
      <span className="ml-4 flex grow flex-col items-start text-left">
        <span
          className={cn(
            'min-w-[100px] text-ds-regular text-foreground [word-break:break-word]',
            value.selected && 'font-semibold',
          )}
        >
          {value.name}
        </span>
        {meta?.helper ? (
          <span className="text-ds-small text-muted-foreground">{meta.helper}</span>
        ) : null}
        <span className={cn('text-ds-small text-muted-foreground', value.selected && 'font-semibold')}>
          {disabled ? (
            COPY.soldOut
          ) : variant?.price ? (
            <Money data={variant.price} />
          ) : null}
        </span>
      </span>
    </span>
  );

  // Back Market card: lavender + dark border when selected; light border, faint hover otherwise.
  const classes = cn(
    'flex size-full rounded-sm border py-3 transition-colors',
    disabled
      ? 'cursor-not-allowed border-dashed border-border opacity-50'
      : value.selected
        ? 'border-foreground bg-violet-50'
        : 'border-border bg-card hover:bg-muted',
  );

  if (disabled)
    return (
      <div role="radio" aria-checked={false} aria-disabled className={classes}>
        {body}
      </div>
    );
  return (
    <LocalizedLink
      href={href}
      replace
      preventScrollReset
      prefetch="intent"
      className={classes}
      role="radio"
      aria-checked={value.selected}
    >
      {body}
    </LocalizedLink>
  );
}

function HeightHelper({step}: {step: PdpStep}) {
  const [height, setHeight] = useState<number | null>(null);
  const ranges = Object.entries(step.values ?? {}).filter(
    ([, v]) => typeof v.minIn === 'number' && typeof v.maxIn === 'number',
  );
  if (!ranges.length) return null;
  const min = Math.min(...ranges.map(([, v]) => v.minIn!)) - 2;
  const max = Math.max(...ranges.map(([, v]) => v.maxIn!)) + 2;
  const heights = Array.from({length: max - min + 1}, (_, i) => min + i);
  const fits = height == null ? [] : ranges.filter(([, v]) => height >= v.minIn! && height <= v.maxIn!);

  return (
    <div className="grid gap-2 rounded-ds-md bg-muted p-4">
      <label htmlFor={`height-${step.option}`} className="text-ds-regular font-semibold">
        {COPY.heightLabel}
      </label>
      <select
        id={`height-${step.option}`}
        className="rounded-ds-sm border border-border bg-card px-3 py-2 text-ds-regular"
        value={height ?? ''}
        onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">{COPY.heightPlaceholder}</option>
        {heights.map((h) => (
          <option key={h} value={h}>
            {formatHeight(h)}
          </option>
        ))}
      </select>
      {height != null ? (
        <p className="text-ds-regular" aria-live="polite">
          {fits.length === 0
            ? COPY.noFit
            : fits.length === 1
              ? `${COPY.recommended}: ${fits[0][0]}`
              : step.betweenSizes ?? fits.map(([n]) => n).join(' or ')}
        </p>
      ) : null}
    </div>
  );
}
