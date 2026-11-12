// Path: app/lib/pdp-schema.ts
//
// Shapes for the two JSON product-page fields. Everything that reads or writes them uses this file:
//   - custom.specs  (json): at-a-glance tiles + full spec table
//   - custom.faq    (json): questions and answers
//   - the storefront renders only data that passes parseSpecs / parseFaq
//   - Shopify validates each field with specsJsonSchema() / faqJsonSchema()
//   - the PDP skills (pdp-build, pdp-verify) and catalog-merge write/check against them
//
// Stays as separate simple fields (unchanged): custom.card_specs, custom.card_badge,
// custom.owners_manual, custom.assembly_video, shipping timing, and Shopify's standard
// category fields (shopify.*), which power filters, Google Shopping and smart collections.
//
// Change a shape? Bump its version and keep the parser able to read the old one.

import {z} from 'zod';

export const PDP_NAMESPACE = 'custom';
export const SPECS_KEY = 'specs';
export const FAQ_KEY = 'faq';
export const SPECS_VERSION = 1;
export const FAQ_VERSION = 1;

const text = (max: number) => z.string().trim().min(1).max(max);
const url = z.url({protocol: /^https$/});
/** Plain text: no HTML tags, no [shortcodes]. */
const plain = (max: number) =>
  text(max).refine((v) => !/<\/?[a-z!][^>]*>|\[\/?[a-z]+(?::[^\]]*)?\]/i.test(v), 'plain text only (no HTML or [shortcodes])');

/** Icons are drawn by the storefront from this fixed set (public/icons/spec/<key>.svg). */
export const SPEC_ICONS = [
  'motor-power', 'range', 'top-speed', 'payload-capacity', 'wireless-connection',
  'increased-safety', 'battery', 'charge-time', 'weight', 'ebike-class', 'folding',
  'suspension', 'tires', 'brakes', 'generic',
] as const;

/** A tile in the "At a glance" row (and the first tiles on the specs section). */
export const AtAGlanceItem = z.strictObject({
  icon: z.enum(SPEC_ICONS),
  label: text(40),
  value: text(60),
  tooltip: text(200).optional(),
});

/** A summary tile at the top of the spec section (e.g. "60 Nm" / "Motor torque"). No icon. */
export const SummaryTile = z.strictObject({value: plain(40), label: plain(60)});

/** One label/value line in the full spec table. */
export const SpecRow = z.strictObject({label: plain(60), value: plain(400)});

/** Spec table, optionally split into titled groups (Motor, Battery, Brakes, ...). */
export const SpecGroup = z.strictObject({
  title: text(60).optional(),
  rows: z.array(SpecRow).min(1).max(100),
});

/** FAQ answer is plain text. A blank line starts a new paragraph. No HTML, no shortcodes. */
export const FaqItem = z.strictObject({q: plain(200), a: plain(2000)});




/** custom.specs: at-a-glance tiles, spec summary tiles and the full spec table. Replaces custom.product_specs
 *  (linked entries) and custom.technical_specifications (HTML page). */
export const SpecsSchema = z.strictObject({
  v: z.literal(SPECS_VERSION),
  /** Icon tiles in the "At a glance" row near the price. */
  atAGlance: z.array(AtAGlanceItem).max(8),
  /** Summary tiles at the top of the spec section. */
  summary: z.array(SummaryTile).max(12),
  /** The full spec table. */
  groups: z.array(SpecGroup).min(1).max(15),
  inTheBox: z.array(plain(80)).max(40).optional(),
  /** Where the facts came from (filled by pdp-facts). Not shown to shoppers. */
  sources: z.array(z.strictObject({label: text(120), url})).max(20).optional(),
});

/** custom.faq: questions and answers. Replaces custom.frequently_asked_questions (HTML page). */
export const FaqSchema = z.strictObject({
  v: z.literal(FAQ_VERSION),
  items: z.array(FaqItem).min(1).max(25),
});

export type Specs = z.infer<typeof SpecsSchema>;
export type Faq = z.infer<typeof FaqSchema>;

function parseJsonField<T>(schema: z.ZodType<T>, field: string, value: string | null | undefined, handleForLogs: string): T | null {
  if (!value) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    console.warn(`[pdp] ${handleForLogs}: custom.${field} is not valid JSON`);
    return null;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    console.warn(`[pdp] ${handleForLogs}: custom.${field} failed the schema`, z.prettifyError(res.error));
    return null;
  }
  return res.data;
}

/** Storefront entry points: metafield value in, typed content (or null) out. Never throw. */
export const parseSpecs = (value: string | null | undefined, handle = '') => parseJsonField(SpecsSchema, SPECS_KEY, value, handle);
export const parseFaq = (value: string | null | undefined, handle = '') => parseJsonField(FaqSchema, FAQ_KEY, value, handle);

/** JSON Schemas uploaded to Shopify as each definition's validation. */
export const specsJsonSchema = () => z.toJSONSchema(SpecsSchema, {target: 'draft-7'});
export const faqJsonSchema = () => z.toJSONSchema(FaqSchema, {target: 'draft-7'});
