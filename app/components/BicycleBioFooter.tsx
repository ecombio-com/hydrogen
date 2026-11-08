import {Suspense} from 'react';
import {Await} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {Container} from '~/components/ui/container';
import LocalizedLink from '~/components/ui/localized-link';
import {Newsletter} from '~/components/footer/newsletter';
import {PaymentIcons} from '~/components/footer/payment-icons';

const BRAND_NAME = 'BicycleBio';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

type FooterMenuItem = {
  id: string;
  title: string;
  url?: string | null;
  items?: FooterMenuItem[];
};

type Column = {id: string; title: string; url?: string | null; links: {id: string; title: string; url: string}[]};

const FALLBACK_COLUMNS: Column[] = [
  {
    id: 'shop',
    title: 'Shop',
    url: '/collections/electric-bikes',
    links: [
      {id: 's1', title: 'All e-bikes', url: '/collections/electric-bikes'},
      {id: 's2', title: 'Seniors', url: '/collections/electric-bikes-for-seniors'},
      {id: 's3', title: 'Heavy riders', url: '/collections/electric-bikes-for-heavy-riders'},
      {id: 's4', title: 'Tall riders', url: '/collections/electric-bikes-for-tall-riders'},
      {id: 's5', title: 'Family', url: '/collections/family-electric-bikes'},
    ],
  },
  {
    id: 'class',
    title: 'Class and power',
    links: [
      {id: 'c1', title: 'Class 1', url: '/collections/class-1-electric-bikes'},
      {id: 'c2', title: 'Class 2', url: '/collections/class-2-electric-bikes'},
      {id: 'c3', title: 'Class 3', url: '/collections/class-3-electric-bikes'},
      {id: 'c4', title: '750W', url: '/collections/750w-electric-bikes'},
      {id: 'c5', title: 'Long range', url: '/collections/long-range-electric-bikes'},
    ],
  },
  {
    id: 'learn',
    title: 'Learn',
    links: [
      {id: 'l1', title: 'Best e-bike guide', url: '/blogs/electric-bikes/best-electric-bike-guide'},
      {id: 'l2', title: 'Class 1 vs 2 vs 3', url: '/blogs/electric-bikes/class-1-vs-class-2-vs-class-3-e-bikes-explained'},
      {id: 'l3', title: 'E-bike laws', url: '/blogs/electric-bikes/e-bike-laws-and-where-you-can-ride'},
      {id: 'l4', title: 'Choosing a commuter e-bike', url: '/blogs/electric-bikes/how-to-choose-the-right-electric-bike-for-commuting'},
    ],
  },
  {
    id: 'support',
    title: 'Support',
    links: [
      {id: 'h1', title: 'Help center', url: '/pages/help-center'},
      {id: 'h2', title: 'Track an order', url: '/pages/track-an-order'},
      {id: 'h3', title: 'Trade-in', url: '/pages/trade-in'},
    ],
  },
];

export function BicycleBioFooter({footer: footerPromise, header, publicStoreDomain}: FooterProps) {
  const primaryDomainUrl = header.shop.primaryDomain?.url ?? '';

  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => {
          const menuItems = ((footer?.menu?.items ?? []) as FooterMenuItem[]).slice(0, 5);
          const columns: Column[] =
            menuItems.length > 0
              ? menuItems.map((col) => ({
                  id: col.id,
                  title: col.title,
                  url: col.url ? internalUrl(col.url, publicStoreDomain, primaryDomainUrl) : null,
                  links: (col.items ?? []).map((leaf) => ({
                    id: leaf.id,
                    title: leaf.title,
                    url: internalUrl(leaf.url ?? '', publicStoreDomain, primaryDomainUrl),
                  })),
                }))
              : FALLBACK_COLUMNS;

          return (
            <footer className="border-t border-border-subtle bg-background">
              <Container className="pt-16 pb-10">
                <div className="flex flex-col gap-12">
                  <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
                    <div className="space-y-3">
                      <LocalizedLink href="/" className="text-2xl font-extrabold uppercase tracking-tight">
                        {BRAND_NAME}
                      </LocalizedLink>
                      <p className="max-w-xs text-ds-regular text-muted-foreground">
                        Find the e-bike that fits your ride, with guides that explain the rest.
                      </p>
                    </div>
                    <Newsletter />
                  </div>

                  <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-4">
                    {columns.map((column, index) => (
                      <div key={column.id} className="space-y-3">
                        {column.url ? (
                          <MenuLink url={column.url} className="block text-ds-regular font-semibold uppercase tracking-tight hover:opacity-70">
                            {column.title}
                          </MenuLink>
                        ) : (
                          <h3 className="text-ds-regular font-semibold uppercase tracking-tight">{column.title}</h3>
                        )}
                        {column.links.length > 0 && (
                          <ul className="space-y-2">
                            {column.links.map((leaf) => (
                              <li key={leaf.id}>
                                <MenuLink url={leaf.url} className="block text-ds-regular text-foreground hover:opacity-70">
                                  {leaf.title}
                                </MenuLink>
                              </li>
                            ))}
                          </ul>
                        )}
                        {index === Math.min(2, columns.length - 1) && <PaymentIcons />}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-between gap-5 border-t border-border-subtle pt-8 sm:flex-row">
                    <p className="text-ds-regular leading-5 text-muted-foreground">
                      &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
                    </p>
                  </div>
                  <p className="text-center text-ds-small text-muted-foreground sm:text-left">
                    Address search by{' '}
                    <a href="https://www.geoapify.com/" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">Geoapify</a>{' '}
                    &copy;{' '}
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">OpenStreetMap</a>{' '}
                    contributors
                  </p>
                </div>
              </Container>
            </footer>
          );
        }}
      </Await>
    </Suspense>
  );
}

function internalUrl(url: string, publicStoreDomain: string, primaryDomainUrl: string) {
  if (!url) return '/';
  const isInternal =
    url.includes('myshopify.com') ||
    url.includes(publicStoreDomain) ||
    (primaryDomainUrl && url.includes(primaryDomainUrl));
  return isInternal ? new URL(url).pathname : url;
}

function MenuLink({url, children, className}: {url: string; children: React.ReactNode; className?: string}) {
  if (url.startsWith('http')) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <LocalizedLink href={url} className={className}>
      {children}
    </LocalizedLink>
  );
}