import {cn} from 'cn';
import {Bike, ShoppingBag} from 'lucide-react';
import {buttonVariants} from '~/components/ui/button';
import LocalizedLink from '~/components/ui/localized-link';

/** Empty cart state. Rendered in place on /cart, /address and /payment, so the URL never changes. */
export function EmptyCart() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/60">
      <div className="mx-auto grid max-w-[1000px] items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="grid justify-items-start gap-3">
          <p className="text-ds-small font-medium text-muted-foreground">Nothing here yet</p>
          <h1 className="text-ds-h3 font-semibold leading-tight text-foreground">Your cart is empty.</h1>
          <p className="text-ds-regular text-muted-foreground">Your next ride is only a few clicks away.</p>
          <LocalizedLink href="/" className={cn(buttonVariants(), 'mt-3 h-12 px-6 text-ds-regular font-semibold')}>
            Start shopping
          </LocalizedLink>
        </div>
        <div aria-hidden="true" className="relative mx-auto flex size-64 items-center justify-center md:size-80">
          <span className="absolute inset-0 rounded-full bg-positive/10" />
          <span className="absolute right-6 top-8 size-4 rounded-full bg-[var(--color-secondary-300)]" />
          <span className="absolute bottom-10 left-6 size-3 rounded-full bg-[var(--color-primary-400)]" />
          <span className="absolute left-12 top-14 size-2 rounded-full bg-foreground/20" />
          <span className="relative flex size-36 items-center justify-center rounded-ds-lg bg-background shadow-ds-drop-md md:size-44">
            <ShoppingBag className="size-16 text-foreground md:size-20" strokeWidth={1.5} />
          </span>
          <span className="absolute bottom-12 right-8 flex size-16 items-center justify-center rounded-full bg-background shadow-ds-drop-sm md:size-20">
            <Bike className="size-8 text-positive md:size-10" strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </div>
  );
}
