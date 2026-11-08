import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {CartDrawer} from '~/components/cart/cart-drawer';
import {getBrandLayout} from '~/brands/layouts';
import type {BrandId} from '~/brands/registry';

import type {AnnouncementBarData} from '~/lib/announcements';

interface PageLayoutProps {
  announcementBar: AnnouncementBarData | null;
  brand?: BrandId;
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  announcementBar,
  brand,
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const {Header, Footer} = getBrandLayout(brand);
  return (
    <Aside.Provider>
      <CartDrawer cart={cart} />
      {header && (
        <Header
          announcementBar={announcementBar}
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
        />
      )}
      <main id="main-content" className="flex-1">{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}
