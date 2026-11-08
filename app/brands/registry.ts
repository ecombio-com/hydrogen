// Brand registry. ecombio points at today's components, so nothing moves.
export type BrandId = 'ecombio' | 'bicyclebio' | 'scooterbio' | 'skaterbio';

export const BRAND_IDS: readonly BrandId[] = ['ecombio', 'bicyclebio', 'scooterbio', 'skaterbio'];

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && (BRAND_IDS as readonly string[]).includes(value);
}
