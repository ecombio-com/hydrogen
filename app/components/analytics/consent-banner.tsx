import {useEffect, useState} from 'react';

type CP = {
  shouldShowBanner?: () => boolean;
  setTrackingConsent?: (
    c: {analytics: boolean; marketing: boolean; preferences: boolean; sale_of_data: boolean},
    cb?: (e?: unknown) => void,
  ) => void;
};

const getCP = () =>
  (window as unknown as {Shopify?: {customerPrivacy?: CP}}).Shopify?.customerPrivacy;

export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const cp = getCP();
      if (cp?.shouldShowBanner) {
        setShow(cp.shouldShowBanner() === true);
        window.clearInterval(timer);
      } else if (tries > 40) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  if (!show) return null;

  const choose = (yes: boolean) =>
    getCP()?.setTrackingConsent?.(
      {analytics: yes, marketing: yes, preferences: yes, sale_of_data: yes},
      () => setShow(false),
    );

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-[100] border-t bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">We use cookies for analytics and marketing. You can accept or decline.</p>
        <div className="flex gap-2">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => choose(false)}>Decline</button>
          <button className="rounded bg-black px-4 py-2 text-sm text-white" onClick={() => choose(true)}>Accept</button>
        </div>
      </div>
    </div>
  );
}
