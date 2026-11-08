import type {ComponentProps, ComponentType} from 'react';
import {Header} from '~/components/Header';
import {Footer} from '~/components/Footer';
import {BicycleBioHeader} from '~/components/BicycleBioHeader';
import {BicycleBioHeaderGym} from '~/components/BicycleBioHeaderGym';
import {BicycleBioFooter} from '~/components/BicycleBioFooter';
import type {BrandId} from '~/brands/registry';

export type BrandLayout = {
  Header: ComponentType<ComponentProps<typeof Header>>;
  Footer: ComponentType<ComponentProps<typeof Footer>>;
};

const ECOMBIO_LAYOUT: BrandLayout = {Header, Footer};

// BicycleBio header style: 'nike' (strip, centered nav, search pill) or 'gym' (nav left, wordmark center, icons right)
const BICYCLEBIO_HEADER_STYLE = 'nike' as 'nike' | 'gym';

export const BRAND_LAYOUTS: Record<BrandId, BrandLayout> = {
  ecombio: ECOMBIO_LAYOUT,
  bicyclebio: {Header: BICYCLEBIO_HEADER_STYLE === 'gym' ? BicycleBioHeaderGym : BicycleBioHeader, Footer: BicycleBioFooter},
  scooterbio: {Header: BicycleBioHeader, Footer: BicycleBioFooter},
  skaterbio: {Header: BicycleBioHeader, Footer: BicycleBioFooter},
};

export function getBrandLayout(brand?: BrandId | null): BrandLayout {
  return BRAND_LAYOUTS[brand ?? 'ecombio'] ?? ECOMBIO_LAYOUT;
}