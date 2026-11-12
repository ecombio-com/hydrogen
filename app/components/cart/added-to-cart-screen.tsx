import {Dialog as DialogPrimitive} from '@base-ui/react/dialog';
import {Image} from '@shopify/hydrogen';
import {CircleCheck} from 'lucide-react';
import {Suspense} from 'react';
import {Await, useNavigate} from 'react-router';
import {useAside} from '~/components/Aside';
import {ProductCard} from '~/components/product-card/product-card';
import type {ProductCardData} from '~/components/product-card/types';
import {useUrlLocale} from '~/components/ui/locale-context';
import type {CrossSell} from '~/lib/product-cross-sell';

const COPY = {
  added: 'Added to cart',
  addedMobile: '1 item added to cart',
  goesWellWith: 'Goes well with',
  othersAlsoBought: 'You may also like',
  inCart: 'Your item is in your cart.',
  back: 'Back',
  goToCart: 'Go to cart',
};

export type AddedItem = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
};

// Full-screen "Added to cart" step (modeled on Back Market): confirms the item,
// offers add-ons in two rows, then sends the shopper to /cart.
// Opened by the product page's Add to cart via useAside().open('added').
export function AddedToCartScreen({
  item,
  crossSell,
}: {
  item: AddedItem;
  crossSell: Promise<CrossSell>;
}) {
  const {type, close} = useAside();
  const navigate = useNavigate();
  const locale = useUrlLocale();
  const cartHref = `${locale ? `/${locale}` : ''}/cart`;

  return (
    <DialogPrimitive.Root
      open={type === 'added'}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          data-slot="added-to-cart"
          className="fixed inset-0 z-60 flex flex-col bg-muted outline-none transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none"
        >
          <header className="shrink-0 bg-background">
            <div className="flex items-center gap-6 px-6 py-3">
              <DialogPrimitive.Title className="flex shrink-0 items-center gap-2 text-ds-regular font-semibold">
                <CircleCheck aria-hidden="true" className="size-6 text-positive" />
                <span className="hidden md:inline">{COPY.added}</span>
                <span className="md:hidden">{COPY.addedMobile}</span>
              </DialogPrimitive.Title>
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                {item.imageUrl ? (
                  <Image
                    data={{url: item.imageUrl, altText: item.imageAlt ?? ''}}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="size-10 shrink-0 rounded-ds-sm border border-border bg-card object-contain"
                  />
                ) : null}
                <p className="line-clamp-2 min-w-0 text-ds-small font-medium">
                  {item.title}
                  {item.subtitle ? (
                    <span className="text-muted-foreground"> · {item.subtitle}</span>
                  ) : null}
                </p>
              </div>
            </div>
            <div aria-hidden="true" className="h-0.75 w-full overflow-hidden bg-background">
              <div className="h-full w-[90%] bg-foreground animate-in slide-in-from-left duration-500 ease-out motion-reduce:animate-none" />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-10">
            <Suspense fallback={null}>
              <Await resolve={crossSell} errorElement={<p className="text-ds-regular">{COPY.inCart}</p>}>
                {(data) =>
                  data.complementary.length === 0 && data.related.length === 0 ? (
                    <p className="text-ds-regular">{COPY.inCart}</p>
                  ) : (
                    <div className="grid gap-8">
                      <Row title={COPY.goesWellWith} products={data.complementary} />
                      <Row title={COPY.othersAlsoBought} products={data.related} />
                    </div>
                  )
                }
              </Await>
            </Suspense>
          </main>

          <footer className="flex shrink-0 items-center justify-between border-t border-border bg-background px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <DialogPrimitive.Close className="cursor-pointer text-ds-regular font-medium underline hover:opacity-70">
              {COPY.back}
            </DialogPrimitive.Close>
            <button
              type="button"
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-ds-md bg-black px-6 text-ds-regular font-semibold text-white hover:bg-black/85"
              onClick={() => {
                close();
                navigate(cartHref);
              }}
            >
              {COPY.goToCart}
            </button>
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Row({title, products}: {title: string; products: ProductCardData[]}) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className="mb-4 font-display text-ds-h3 font-semibold tracking-tight">{title}</h2>
      <ul className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-4 overflow-x-auto px-6 pb-2">
        {products.map((product) => (
          <li key={product.id} className="w-56 shrink-0 snap-start sm:w-64">
            <ProductCard product={product} compact openCartOnAdd={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
