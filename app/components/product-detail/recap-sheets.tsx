import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Headphones,
  Heart,
  Lock,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {Suspense, useMemo, useState} from 'react';
import {Await} from 'react-router';
import {SideSheet} from '~/components/ui/side-sheet';
import type {Faq, Specs} from '~/lib/pdp-schema';
import type {ProductExtras} from '~/lib/product-extras.server';

const COPY = {
  specs: 'Technical specifications',
  perks: 'Perks & benefits included',
  perksTitle: 'Perks & benefits',
  included: 'Included services',
  faq: 'Frequently asked questions',
  filter: 'Filter specifications',
  noMatch: 'No specification matches that search.',
};

type Sheet = 'specs' | 'perks' | 'faq';

// Same icon names as the reassurance bar (custom.reassurance), so one entry drives both places.
const PERK_ICONS: Record<string, LucideIcon> = {
  support: Headphones,
  headphones: Headphones,
  heart: Heart,
  payment: CreditCard,
  creditcard: CreditCard,
  installments: CreditCard,
  lock: Lock,
  returns: RotateCcw,
  return: RotateCcw,
  calendar: CalendarDays,
  shipping: Truck,
  truck: Truck,
  warranty: ShieldCheck,
  shield: ShieldCheck,
  repair: Wrench,
};
const perkIcon = (name: string) => PERK_ICONS[name.toLowerCase().replace(/[^a-z]/g, '')] ?? CircleCheck;

// The three Back Market rows under "Comes with". Each opens a side sheet. Data comes from the
// product's JSON fields (custom.specs, custom.faq) and the custom.reassurance entries.
// A row only shows when its data exists.
export function RecapSheets({name, extras}: {name: string; extras: Promise<ProductExtras>}) {
  const [open, setOpen] = useState<Sheet | null>(null);
  return (
    <Suspense fallback={null}>
      <Await resolve={extras} errorElement={<></>}>
        {(x) => {
          const rows: {id: Sheet; label: string; show: boolean}[] = [
            {id: 'specs', label: COPY.specs, show: !!x.specs?.groups?.length},
            {id: 'perks', label: COPY.perks, show: x.reassurance.length > 0},
            {id: 'faq', label: COPY.faq, show: !!x.faq?.items?.length},
          ];
          const visible = rows.filter((r) => r.show);
          if (!visible.length) return null;
          return (
            <>
              <ul className="divide-y divide-border border-y border-border">
                {visible.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(r.id)}
                      className="flex w-full cursor-pointer items-center justify-between px-5 py-5 text-left text-ds-regular text-foreground hover:bg-muted"
                    >
                      {r.label}
                      <ChevronRight aria-hidden className="size-6 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
              <SideSheet open={open === 'specs'} onClose={() => setOpen(null)} title={COPY.specs}>
                {x.specs ? <SpecsSheet name={name} specs={x.specs} /> : null}
              </SideSheet>
              <SideSheet open={open === 'perks'} onClose={() => setOpen(null)} title={COPY.perksTitle}>
                <h3 className="text-ds-h4 font-semibold">{COPY.included}</h3>
                <ul className="mt-4 grid gap-6">
                  {x.reassurance.map((item) => {
                    const Icon = perkIcon(item.icon);
                    return (
                      <li key={item.label} className="flex items-start gap-3">
                        <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
                        <div className="grid gap-1">
                          <p className="text-ds-regular font-semibold">{item.label}</p>
                          {item.description ? (
                            <p className="text-ds-small text-muted-foreground">{item.description}</p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SideSheet>
              <SideSheet open={open === 'faq'} onClose={() => setOpen(null)} title={COPY.faq}>
                {x.faq ? <FaqSheet faq={x.faq} /> : null}
              </SideSheet>
            </>
          );
        }}
      </Await>
    </Suspense>
  );
}

function SpecsSheet({name, specs}: {name: string; specs: Specs}) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specs.groups
      .map((g) => ({
        title: g.title,
        rows: q
          ? g.rows.filter((r) => `${r.label} ${r.value}`.toLowerCase().includes(q))
          : g.rows,
      }))
      .filter((g) => g.rows.length);
  }, [specs, query]);

  return (
    <div className="pb-14">
      <h3 className="text-ds-h3 font-semibold">{name}</h3>
      <div className="relative mt-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={COPY.filter}
          aria-label={COPY.filter}
          autoComplete="off"
          className="h-12 w-full rounded-sm border border-border bg-card pr-11 pl-3 text-ds-regular"
        />
      </div>
      {groups.length === 0 ? (
        <p className="mt-6 text-ds-regular text-muted-foreground">{COPY.noMatch}</p>
      ) : (
        groups.map((g, i) => (
          <div key={g.title ?? i} className="mt-4">
            {g.title && specs.groups.length > 1 ? (
              <h4 className="pt-4 text-ds-regular font-semibold">{g.title}</h4>
            ) : null}
            <ul className="divide-y divide-border">
              {g.rows.map((r) => (
                <li key={r.label} className="flex items-start justify-between gap-6 py-5">
                  <span className="text-ds-regular text-foreground">{r.label}</span>
                  <span className="text-right text-ds-small whitespace-pre-line text-muted-foreground">
                    {r.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function FaqSheet({faq}: {faq: Faq}) {
  // Back Market FAQ sheet: no heading, just question rows that open in place.
  return (
    <ul className="-mx-2 divide-y divide-border">
      {faq.items.map((item) => (
        <li key={item.q}>
          <details className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-ds-regular text-foreground [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                aria-hidden
                className="mt-0.5 size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 grid gap-2 text-ds-small text-muted-foreground">
              {item.a.split(/\n\s*\n/).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
