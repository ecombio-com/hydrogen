// Shape of the custom.pdp_steps JSON metafield (v1). Prices, stock and images are NOT stored here:
// they come from the product's variants, so they can never drift out of sync.
export interface PdpStepValue {
  helper?: string;
  /** Color dot for the option card, e.g. "#7C98AB". */
  swatch?: string;
  minIn?: number;
  maxIn?: number;
}

export interface PdpStep {
  option: string;
  title: string;
  image?: 'variant' | string;
  heightHelper?: boolean;
  betweenSizes?: string;
  swatch?: 'variantImage';
  values?: Record<string, PdpStepValue>;
}

// Back Market-style heading: line 1 = short model name + key qualifier ("iPhone 13 • Unlocked"),
// line 2 = the selected options in subtitleOrder ("Midnight • 256 GB • Physical SIM + eSIM").
export interface PdpHeading {
  name: string;
  tag?: string;
  subtitleOrder?: string[];
}

// Back Market "recap" block under the steps. Only copy lives here; price/stock/photos come from variants.
export interface PdpRecap {
  chips?: string[];
  infoCards?: {icon?: string; title: string; subtitle?: string; href?: string}[];
  comesWith?: {icon?: string; label: string}[];
}

export interface PdpSteps {
  v: 1;
  /** Back Market-style variant URL, e.g. "aventon-pace-4-{Size}-step-through-{Color}-electric-cruiser-bike".
   *  Each {Option} is replaced by the slugified selected value. Each filled URL needs a matching
   *  pdp_variant_url entry in Shopify (scripts/shopify/set-variant-urls.mjs creates them). */
  urlTemplate?: string;
  heading?: PdpHeading;
  recap?: PdpRecap;
  steps: PdpStep[];
  addons?: {title?: string; products?: string[]};
}

export function parsePdpSteps(value?: string | null): PdpSteps | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as Partial<PdpSteps>;
    if (data?.v !== 1 || !Array.isArray(data.steps)) return null;
    const steps = data.steps.filter(
      (s): s is PdpStep => !!s && typeof s.option === 'string' && typeof s.title === 'string',
    );
    const heading =
      data.heading && typeof data.heading.name === 'string' ? data.heading : undefined;
    const urlTemplate =
      typeof data.urlTemplate === 'string' && /\{[^}]+\}/.test(data.urlTemplate)
        ? data.urlTemplate
        : undefined;
    return steps.length
      ? {v: 1, urlTemplate, heading, recap: data.recap, steps, addons: data.addons}
      : null;
  } catch {
    return null;
  }
}

export function formatHeight(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function variantSubtitle(
  selected: {name: string; value: string}[] | undefined,
  order?: string[],
) {
  const opts = (selected ?? []).filter((o) => o.value !== 'Default Title');
  const sorted = order?.length
    ? [...opts].sort((a, b) => {
        const ia = order.indexOf(a.name);
        const ib = order.indexOf(b.name);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
    : opts;
  return sorted.map((o) => o.value).join(' • ');
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Fills {Size}/{Color}... in the template. Returns null if any placeholder has no value. */
export function fillUrlTemplate(template: string, selected: {name: string; value: string}[]) {
  const byName = new Map(selected.map((o) => [o.name.toLowerCase(), o.value]));
  let missing = false;
  const slug = template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const v = byName.get(name.trim().toLowerCase());
    if (!v) missing = true;
    return v ? slugify(v) : '';
  });
  return missing ? null : slugify(slug);
}
