import {useLocation} from 'react-router';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {CartDrawer} from '~/components/cart/cart-drawer';
import {CheckoutFooter, CheckoutHeader, isCheckoutPath} from '~/components/checkout/checkout-shell';
import {getBrandLayout} from '~/brands/layouts';
import type {BrandId} from '~/brands/registry';

import type {AnnouncementBarData} from '~/lib/announcements';

interface PageLayoutProps {
  announcementBar: AnnouncementBarData | null;
  brand?: BrandId;
  brandName?: string;
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
  brandName,
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const {pathname} = useLocation();
  const {Header, Footer} = getBrandLayout(brand);

  // Cart, address, payment and confirmation use a focused, logo-only layout.
  if (isCheckoutPath(pathname)) {
    return (
      <Aside.Provider>
        <CheckoutHeader brandName={brandName || header?.shop?.name || 'Store'} />
        <main id="main-content" className="flex-1">{children}</main>
        <CheckoutFooter />
      </Aside.Provider>
    );
  }

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
