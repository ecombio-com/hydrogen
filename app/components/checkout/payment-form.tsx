import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {loadStripe, type Stripe, type StripeElements} from '@stripe/stripe-js';
import {Lock} from 'lucide-react';

export function PaymentForm({publishableKey, clientSecret, total}: {publishableKey: string; clientSecret: string; total: string}) {
  const navigate = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unmount: (() => void) | undefined;
    loadStripe(publishableKey).then((stripe) => {
      if (cancelled || !stripe || !mountRef.current) return;
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          labels: 'floating',
          variables: {
            borderRadius: '8px',
            colorPrimary: '#0e1016',
            colorText: '#0e1016',
            colorDanger: '#cc0001',
            fontFamily: 'Geist, system-ui, sans-serif',
          },
        },
      });
      const payment = elements.create('payment', {layout: {type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: false}});
      payment.mount(mountRef.current);
      payment.on('ready', () => setReady(true));
      stripeRef.current = stripe;
      elementsRef.current = elements;
      unmount = () => payment.destroy();
    });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [publishableKey, clientSecret]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const {error, paymentIntent} = await stripe.confirmPayment({
      elements,
      confirmParams: {return_url: `${window.location.origin}/payment/complete`},
      redirect: 'if_required',
    });
    if (error) setError(error.message ?? 'Payment failed.');
    else if (paymentIntent) {
      navigate(`/payment/complete?payment_intent=${paymentIntent.id}`);
      return;
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div ref={mountRef} className="min-h-48" />
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-2">
        <button
          type="submit"
          disabled={!ready || busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0e1016] text-base font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          <Lock className="size-4" aria-hidden="true" />
          {busy ? 'Processing…' : `Pay ${total}`}
        </button>
        <p className="text-center text-xs text-neutral-500">
          Secure payment. Your card details are encrypted and never touch our servers.
        </p>
      </div>
    </form>
  );
}
