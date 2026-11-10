import {Image} from '@shopify/hydrogen';
import {cn} from 'cn';
import {
  ArrowLeft,
  Headphones,
  Lock,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {PaymentIcons} from '~/components/footer/payment-icons';
import LocalizedLink from '~/components/ui/localized-link';

/* ---------- Routes that use the focused checkout chrome ---------- */

const CHECKOUT_PATH = /(^|\/)(cart|address|payment)(\/complete)?\/?$/;

export function isCheckoutPath(pathname: string) {
  return CHECKOUT_PATH.test(pathname);
}

/* ---------- Header + footer (logo only, no menu) ---------- */

export function CheckoutHeader({brandName}: {brandName: string}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 lg:px-8">
        <LocalizedLink
          href="/"
          className="text-ds-medium font-semibold tracking-tight text-foreground"
          aria-label={`${brandName} home`}
        >
          {brandName}
        </LocalizedLink>
        <div className="flex items-center gap-4 text-ds-small">
          <span className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
            <Lock className="size-3.5 text-positive" aria-hidden="true" />
            Secure checkout
          </span>
          <LocalizedLink href="/pages/help-center" className="font-medium text-foreground underline-offset-4 hover:underline">
            Help
          </LocalizedLink>
        </div>
      </div>
    </header>
  );
}

export function CheckoutFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-ds-small text-muted-foreground lg:px-8">
        <LocalizedLink href="/policies/terms-of-service" className="hover:text-foreground">Terms of Service</LocalizedLink>
        <LocalizedLink href="/policies/privacy-policy" className="hover:text-foreground">Privacy Policy</LocalizedLink>
        <LocalizedLink href="/policies/refund-policy" className="hover:text-foreground">Returns</LocalizedLink>
        <LocalizedLink href="/policies/shipping-policy" className="hover:text-foreground">Shipping</LocalizedLink>
      </div>
    </footer>
  );
}

/* ---------- Page frame: content left (max 820px), gray summary panel right (440px) ---------- */

export function CheckoutShell({
  children,
  aside,
  footerBar,
}: {
  children: ReactNode;
  aside?: ReactNode;
  footerBar?: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/60 lg:grid lg:grid-cols-[minmax(0,1fr)_27.5rem]">
      <div className="px-4 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-8">
        <div className="mx-auto grid w-full max-w-[820px] gap-6">{children}</div>
      </div>
      {aside ? (
        <aside
          aria-label="Order summary"
          className="border-t border-border bg-muted px-4 py-6 lg:border-l lg:border-t-0 lg:px-6 lg:py-8"
        >
          <div className="grid gap-4 lg:sticky lg:top-[4.5rem]">{aside}</div>
        </aside>
      ) : null}
      {footerBar ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-3 shadow-ds-drop-md lg:hidden">
          {footerBar}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Progress: back arrow + "2/4 Address" + bar ---------- */

const STEPS = ['Cart', 'Address', 'Payment', 'Confirmation'] as const;
export type CheckoutStep = (typeof STEPS)[number];

export function CheckoutProgress({step, backHref}: {step: CheckoutStep; backHref?: string}) {
  const index = STEPS.indexOf(step);
  const pct = ((index + 1) / STEPS.length) * 100;
  return (
    <nav aria-label="Checkout progress" className="grid gap-3">
      <div className="relative flex h-8 items-center justify-center">
        {backHref ? (
          <LocalizedLink
            href={backHref}
            aria-label="Back"
            className="absolute left-0 flex size-8 items-center justify-center rounded-full hover:bg-background"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </LocalizedLink>
        ) : null}
        <p className="text-ds-small font-semibold text-foreground">
          {index + 1}/{STEPS.length} {step}
          <span className="sr-only">, step {index + 1} of {STEPS.length}</span>
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{width: `${pct}%`}} />
      </div>
    </nav>
  );
}

/* ---------- Building blocks ---------- */

export function CheckoutCard({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('grid gap-4 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs', className)}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3">
          {title ? <h2 className="text-ds-regular font-semibold text-foreground">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionTitle({children}: {children: ReactNode}) {
  return <h1 className="text-ds-medium font-semibold text-foreground">{children}</h1>;
}

export function SecureNote({className}: {className?: string}) {
  return (
    <p className={cn('flex items-center justify-center gap-1.5 text-ds-small text-muted-foreground', className)}>
      <Lock className="size-3.5 text-positive" aria-hidden="true" />
      Secure payment
    </p>
  );
}

export function TrustBox() {
  return (
    <div className="grid justify-items-center gap-2.5 rounded-ds-md border border-border bg-background p-3">
      <PaymentIcons />
      <SecureNote />
    </div>
  );
}

export function ConsentNote() {
  return (
    <p className="text-ds-small leading-snug text-muted-foreground">
      By confirming this order you accept our{' '}
      <LocalizedLink href="/policies/terms-of-service" className="font-medium text-foreground underline underline-offset-2">
        Terms of Service
      </LocalizedLink>{' '}
      and our{' '}
      <LocalizedLink href="/policies/privacy-policy" className="font-medium text-foreground underline underline-offset-2">
        Privacy Policy
      </LocalizedLink>
      .
    </p>
  );
}

const PERKS = [
  {icon: ShieldCheck, label: 'Warranty included', href: '/pages/warranty'},
  {icon: Truck, label: 'Free standard shipping', href: '/policies/shipping-policy'},
  {icon: RotateCcw, label: 'Easy returns', href: '/policies/refund-policy'},
  {icon: Headphones, label: 'Friendly customer service', href: '/pages/contact'},
];

export function Perks() {
  return (
    <section aria-labelledby="perks-heading" className="grid gap-3">
      <h2 id="perks-heading" className="text-ds-regular font-semibold text-foreground">
        Your perks with every purchase
      </h2>
      <ul className="grid gap-3 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs sm:grid-cols-2">
        {PERKS.map(({icon: Icon, label, href}) => (
          <li key={label}>
            <LocalizedLink href={href} className="flex items-center gap-3 text-ds-small text-foreground hover:underline">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-ds-md bg-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {label}
            </LocalizedLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Summary panel pieces ---------- */

export type SummaryLine = {
  id: string;
  title: string;
  qty: number;
  price?: string;
  variant?: string;
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
};

export function SummaryItems({lines}: {lines: SummaryLine[]}) {
  return (
    <ul className="grid gap-3">
      {lines.map((l) => (
        <li key={l.id} className="flex items-start gap-3">
          <div className="relative size-12 shrink-0">
            <div className="size-12 overflow-hidden rounded-ds-md border border-border bg-muted">
              {l.image?.url ? (
                <Image data={l.image} alt={l.image.altText || l.title} sizes="48px" className="size-full object-cover" />
              ) : null}
            </div>
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[0.6875rem] font-semibold text-background">
              {l.qty}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-ds-small font-medium text-foreground">{l.title}</p>
            {l.variant ? <p className="text-ds-small text-muted-foreground">{l.variant}</p> : null}
          </div>
          {l.price ? <p className="text-ds-small font-medium tabular-nums text-foreground">{l.price}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function SummaryRow({
  label,
  value,
  strong,
  positive,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 text-ds-small', strong ? 'text-ds-regular font-semibold text-foreground' : 'text-foreground')}>
      <span>{label}</span>
      <span className={cn('tabular-nums', positive && 'font-medium text-positive')}>{value}</span>
    </div>
  );
}

export function SummaryDivider() {
  return <hr className="border-border" />;
}

export function AddressBlock({
  heading,
  address,
  editHref,
}: {
  heading: string;
  address: {firstName: string; lastName: string; address1: string; address2?: string; city: string; state: string; zip: string; phone?: string};
  editHref: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-ds-lg bg-background p-4 shadow-ds-drop-xs">
      <div className="text-ds-small leading-relaxed text-foreground">
        <p className="font-semibold">
          {heading} {address.firstName} {address.lastName}
        </p>
        <p>
          {address.address1}
          {address.address2 ? `, ${address.address2}` : ''}
        </p>
        <p>
          {address.city}, {address.state} {address.zip}
        </p>
        <p>United States</p>
        {address.phone ? <p className="text-muted-foreground">{formatPhone(address.phone)}</p> : null}
      </div>
      <LocalizedLink
        href={editHref}
        className="shrink-0 rounded-ds-md border border-foreground px-3 py-1.5 text-ds-small font-medium text-foreground hover:bg-muted"
      >
        Modify
      </LocalizedLink>
    </div>
  );
}

export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}
