// One entry per Hydrogen storefront, keyed by the PUBLIC_STOREFRONT_ID that Shopify injects.
// Unknown or missing IDs fall back to ecombio, so ecombio can never break.
export type StorefrontConfig = {
  slug: string;
  brand: 'ecombio' | 'bicyclebio';
  name: string;
  headerMenuHandle: string;
  footerMenuHandle: string;
};

const ECOMBIO_ID = '1000184544';

const CONFIGS: Record<string, StorefrontConfig> = {
  [ECOMBIO_ID]: {slug: 'ecombio', brand: 'ecombio', name: 'Ecombio', headerMenuHandle: 'main-menu', footerMenuHandle: 'footer'},
  '1000179978': {slug: 'bicyclebio', brand: 'bicyclebio', name: 'BicycleBio', headerMenuHandle: 'bicyclebio-main', footerMenuHandle: 'bicyclebio-footer'},
};

export function getStorefrontConfig(id?: string | null): StorefrontConfig {
  const key = String(id ?? '').replace(/\D/g, '');
  return CONFIGS[key] ?? CONFIGS[ECOMBIO_ID];
}
