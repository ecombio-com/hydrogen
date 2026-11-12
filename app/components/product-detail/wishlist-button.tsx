import {cn} from 'cn';
import {Heart} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import {useUrlLocale} from '~/components/ui/locale-context';
import type {RootLoader} from '~/root';

const COPY = {
  add: 'Add to Favorites',
  remove: 'Remove from Favorites',
};
const KEY = 'ecombio:favorites';

function readFavorites(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

// Back Market-style heart next to "Add to cart". Logged out: sends the shopper to sign in, then
// back to this exact product URL (Hydrogen's login reads ?return_to). Logged in: toggles the
// favorite. Favorites are kept in this browser for now, not yet synced to the customer account.
export function WishlistButton({productHandle, className}: {productHandle: string; className?: string}) {
  const root = useRouteLoaderData<RootLoader>('root');
  const locale = useUrlLocale();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(readFavorites().includes(productHandle));
  }, [productHandle]);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    const loggedIn = await Promise.resolve(root?.isLoggedIn).catch(() => false);
    if (!loggedIn) {
      const back = window.location.pathname + window.location.search;
      const login = `${locale ? `/${locale}` : ''}/account/login`;
      window.location.assign(`${login}?${new URLSearchParams({return_to: back})}`);
      return;
    }
    const list = readFavorites();
    const next = list.includes(productHandle)
      ? list.filter((h) => h !== productHandle)
      : [...list, productHandle];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private mode): still show the toggle for this visit.
    }
    setSaved(next.includes(productHandle));
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? COPY.remove : COPY.add}
      aria-pressed={saved}
      className={cn(
        'inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-ds-md border border-foreground bg-card text-foreground transition-colors hover:bg-muted',
        className,
      )}
    >
      <Heart className={cn('size-6', saved && 'fill-current')} aria-hidden />
    </button>
  );
}
