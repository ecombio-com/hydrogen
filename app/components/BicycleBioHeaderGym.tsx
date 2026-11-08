import {useEffect, useState} from 'react';
import {useLocation} from 'react-router';
import type {CartApiQueryFragment, HeaderQuery} from 'storefrontapi.generated';
import {AccountLink, CartToggle} from '~/components/Header';
import {Container} from '~/components/ui/container';
import LocalizedLink from '~/components/ui/localized-link';
import {NavScrollBehavior} from '~/components/nav/nav-scroll-behavior';
import {NavHeightSync} from '~/components/nav/nav-height-sync';
import {QuickLinks} from '~/components/nav/quick-links';
import {SearchModal} from '~/components/nav/search-modal';
import {MobileMenu} from '~/components/nav/mobile-menu';
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
const HOME_PATH = /^\/([a-z]{2}(-[a-z]{2})?)?\/?$/i;

const FALLBACK_ITEMS: MenuItem[] = [
  {id: 'bb-nav-shop', title: 'E-Bikes', url: '/collections/electric-bikes', image: null, items: []},
];

export function BicycleBioHeaderGym({header, isLoggedIn, cart, publicStoreDomain}: BicycleBioHeaderProps) {
  const {shop, menu} = header;
  const {pathname} = useLocation();
  const isHome = HOME_PATH.test(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const parsed = parseNavMenu(
    (menu?.items ?? []) as unknown as RawMenuItem[],
    publicStoreDomain,
    shop.primaryDomain.url,
  );
  const navItems = parsed.length > 0 ? parsed : FALLBACK_ITEMS;

  // Transparent only at the very top of the home page, and not while hovered or focused.
  const clear = isHome && !scrolled && !engaged;

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
        onMouseEnter={() => setEngaged(true)}
        onMouseLeave={() => setEngaged(false)}
        onFocusCapture={() => setEngaged(true)}
        onBlurCapture={() => setEngaged(false)}
        style={clear ? {backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))'} : undefined}
        className={[
          'sticky top-0 z-30 w-full border-b pt-[env(safe-area-inset-top,0px)] transition-colors duration-200',
          isHome ? '-mb-[57px] md:-mb-[65px]' : '',
          clear
            ? 'border-transparent bg-transparent text-white [--color-foreground:#fff] [--foreground:#fff]'
            : 'border-border-subtle bg-background',
        ].join(' ')}
      >
        <NavScrollBehavior />
        <NavHeightSync />

        <Container className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 md:h-16">
          <div className="flex items-center">
            <div className="md:hidden">
              <MobileMenu items={navItems} isLoggedIn={isLoggedIn} />
            </div>
            <div className="hidden justify-start md:flex [&_a]:text-sm [&_a]:font-semibold [&_button]:text-sm [&_button]:font-semibold">
              <QuickLinks items={navItems} />
            </div>
          </div>

          <LocalizedLink
            href="/"
            aria-label={`${BRAND_NAME} home`}
            className="text-xl font-extrabold uppercase tracking-tight md:text-2xl"
          >
            {BRAND_NAME}
          </LocalizedLink>

          <div className="flex items-center justify-end gap-4">
            <div className="[&_button]:h-9 [&_button]:w-9 [&_button]:justify-center [&_button]:bg-transparent [&_button]:px-0 [&_button_span]:hidden">
              <SearchModal />
            </div>
            <div className="[&_span[aria-hidden=true]]:hidden">
              <AccountLink isLoggedIn={isLoggedIn} />
            </div>
            <CartToggle cart={cart} />
          </div>
        </Container>
      </header>
    </>
  );
}