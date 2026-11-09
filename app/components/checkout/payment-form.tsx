import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {loadStripe, type Stripe, type StripeElements} from '@stripe/stripe-js';

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
      const elements = stripe.elements({clientSecret, appearance: {theme: 'stripe', labels: 'floating', variables: {borderRadius: '8px'}}});
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
    <form onSubmit={onSubmit} className="space-y-6">
      <div ref={mountRef} className="min-h-48" />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={!ready || busy} className="h-12 w-full rounded-md bg-black text-white disabled:opacity-50">
        {busy ? 'Processing…' : `Pay ${total}`}
      </button>
    </form>
  );
}
