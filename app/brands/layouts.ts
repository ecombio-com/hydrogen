import type {ComponentProps, ComponentType} from 'react';
import {Header} from '~/components/Header';
import {Footer} from '~/components/Footer';
import {BicycleBioHeader} from '~/components/BicycleBioHeader';
import type {BrandId} from '~/brands/registry';

export type BrandLayout = {
  Header: ComponentType<ComponentProps<typeof Header>>;
  Footer: ComponentType<ComponentProps<typeof Footer>>;
};

const ECOMBIO_LAYOUT: BrandLayout = {Header, Footer};

export const BRAND_LAYOUTS: Record<BrandId, BrandLayout> = {
  ecombio: ECOMBIO_LAYOUT,
  bicyclebio: {Header: BicycleBioHeader, Footer},
};

export function getBrandLayout(brand?: BrandId | null): BrandLayout {
  return BRAND_LAYOUTS[brand ?? 'ecombio'] ?? ECOMBIO_LAYOUT;
}