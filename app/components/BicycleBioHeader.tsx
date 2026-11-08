import type {CartApiQueryFragment, HeaderQuery} from 'storefrontapi.generated';
import {AccountLink, CartToggle} from '~/components/Header';
import {Container} from '~/components/ui/container';
import LocalizedLink from '~/components/ui/localized-link';
import {NavScrollBehavior} from '~/components/nav/nav-scroll-behavior';
import {NavHeightSync} from '~/components/nav/nav-height-sync';
import {QuickLinks} from '~/components/nav/quick-links';
import {SearchModal} from '~/components/nav/search-modal';
import {MobileMenu} from '~/components/nav/mobile-menu';
import {ZipCode} from '~/components/nav/zip-code';
import type {AnnouncementBarData} from '~/lib/announcements';
import {parseNavMenu, type MenuItem, type RawMenuItem} from '~/lib/menu';

interface BicycleBioHeaderProps {
  announcementBar: AnnouncementBarData | null;
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

const BRAND_NAME = 'BicycleBio';

const FALLBACK_ITEMS: MenuItem[] = [
  {id: 'bb-nav-shop', title: 'E-Bikes', url: '/collections/electric-bikes', image: null, items: []},
];

const UTILITY_LINKS = [
  {label: 'Help', url: '/pages/help-center'},
  {label: 'Track an order', url: '/pages/track-an-order'},
  {label: 'Trade-in', url: '/pages/trade-in'},
];

export function BicycleBioHeader({header, isLoggedIn, cart, publicStoreDomain}: BicycleBioHeaderProps) {
  const {shop, menu} = header;
  const parsed = parseNavMenu(
    (menu?.items ?? []) as unknown as RawMenuItem[],
    publicStoreDomain,
    shop.primaryDomain.url,
  );
  const navItems = parsed.length > 0 ? parsed : FALLBACK_ITEMS;
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-ds-md focus:bg-background focus:px-ds-regular focus:py-2 focus:text-ds-regular focus:font-medium focus:ring-2 focus:ring-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <header
        id="nav-outer"
        className="sticky top-0 z-30 w-full border-b border-border-subtle bg-card pt-[env(safe-area-inset-top,0px)]"
      >
        <NavScrollBehavior />
        <NavHeightSync />

        <div className="hidden bg-muted md:block">
          <Container className="flex h-8 items-center justify-end gap-5 text-ds-small font-medium">
            {UTILITY_LINKS.map((link) => (
              <LocalizedLink key={link.url} href={link.url} className="whitespace-nowrap hover:opacity-70">
                {link.label}
              </LocalizedLink>
            ))}
            <ZipCode />
          </Container>
        </div>

        <Container className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 md:flex-nowrap md:gap-8">
          <div className="md:hidden">
            <MobileMenu items={navItems} isLoggedIn={isLoggedIn} />
          </div>

          <LocalizedLink
            href="/"
            aria-label={`${BRAND_NAME} home`}
            className="shrink-0 text-xl font-medium tracking-tight"
          >
            {BRAND_NAME}
          </LocalizedLink>

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <QuickLinks items={navItems} />
          </div>

          <div className="order-last w-full md:order-none md:w-56 md:shrink-0">
            <SearchModal />
          </div>

          <div className="ml-auto flex items-center gap-5 md:ml-0">
            <AccountLink isLoggedIn={isLoggedIn} />
            <CartToggle cart={cart} />
          </div>
        </Container>
      </header>
    </>
  );
}