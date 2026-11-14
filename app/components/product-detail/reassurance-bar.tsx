// Path: app/components/product-detail/reassurance-bar.tsx
// Reassurance bar (pdp.policy reassurance): one gray bar, icon + label per item.
// icon is a name mapped below; an image URL renders as an image; unknown names get a check mark.
import {
  Award,
  CircleCheck,
  Clock,
  CreditCard,
  Headphones,
  Lock,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type {ReassuranceItem} from '~/lib/product-extras.server';

const COPY = {
  label: 'Why shop with us',
};

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  shipping: Truck,
  freeshipping: Truck,
  delivery: Truck,
  shield: ShieldCheck,
  shieldcheck: ShieldCheck,
  warranty: ShieldCheck,
  return: RotateCcw,
  returns: RotateCcw,
  rotateccw: RotateCcw,
  undo: RotateCcw,
  support: Headphones,
  headphones: Headphones,
  headset: Headphones,
  help: Headphones,
  lock: Lock,
  secure: Lock,
  securepayment: Lock,
  payment: CreditCard,
  creditcard: CreditCard,
  financing: CreditCard,
  wrench: Wrench,
  assembly: Wrench,
  tools: Wrench,
  award: Award,
  quality: Award,
  package: Package,
  box: Package,
  clock: Clock,
  fast: Clock,
};

function ItemIcon({icon}: {icon: string}) {
  if (/^https?:\/\//.test(icon)) {
    return <img alt="" aria-hidden="true" className="size-5 shrink-0 object-contain" src={icon} />;
  }
  const Icon = ICONS[icon.toLowerCase().replace(/[^a-z]/g, '')] ?? CircleCheck;
  return <Icon aria-hidden="true" className="size-5 shrink-0" />;
}

export function ReassuranceBar({items}: {items: ReassuranceItem[]}) {
  if (items.length === 0) return null;

  return (
    <section aria-label={COPY.label}>
      <ul className="grid grid-cols-2 gap-x-(--spacer-regular) gap-y-3 rounded-ds-lg bg-(--color-bg-secondary) px-(--spacer-regular) py-4 md:flex md:flex-wrap md:items-center md:justify-around">
        {items.map((item) => (
          <li className="flex items-center gap-2" key={`${item.icon}-${item.label}`}>
            <ItemIcon icon={item.icon} />
            <span className="font-medium text-ds-small">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
