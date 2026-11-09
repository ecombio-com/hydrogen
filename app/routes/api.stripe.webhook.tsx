import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {STOREFRONT_ID} from '~/lib/storefront-id';
import type {ActionFunctionArgs} from 'react-router';
import {createPaidOrder, mailingFromIntent, parseLines, stripeCall, type Env} from '~/lib/shopify-order.server';

const enc = new TextEncoder();

async function verify(raw: string, header: string, secret: string) {
  if (!secret || !header) return false;
  let t = '';
  const sigs: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') t = v;
    else if (k === 'v1') sigs.push(v);
  }
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.includes(hex);
}

export function loader() {
  return new Response('Method not allowed', {status: 405});
}

// Backstop only: creates the Shopify order if the shopper never reached /payment/complete.
export async function action({request, context}: ActionFunctionArgs) {
  const env = context.env as unknown as Env;
  if (!stripeCheckoutEnabled(env)) return new Response('Not found', {status: 404});
  const raw = await request.text();
  if (!(await verify(raw, request.headers.get('stripe-signature') ?? '', env.STRIPE_WEBHOOK_SECRET ?? ''))) {
    return new Response('Bad signature', {status: 400});
  }
  const event = JSON.parse(raw) as {type?: string; data?: {object?: {id?: string}}};
  const piId = event.data?.object?.id;
  if (event.type !== 'payment_intent.succeeded' || !piId) return new Response('ignored', {status: 200});

  const pi = await stripeCall(env, `payment_intents/${piId}`);
  if (pi.status !== 'succeeded') return new Response('not succeeded', {status: 200});
  if (!pi.metadata?.cart_id) return new Response('skipped: not a checkout payment', {status: 200});
  if (pi.metadata.storefront_id !== STOREFRONT_ID) return new Response('skipped: other storefront', {status: 200});
  if (pi.metadata.shopify_order_name) return new Response('already done', {status: 200});

  const minAge = Number(env.STRIPE_WEBHOOK_MIN_AGE_SECONDS ?? 120);
  if (Date.now() / 1000 - (pi.created ?? 0) < minAge) {
    return new Response('too fresh, retry later', {status: 503});
  }

  const lines = parseLines(Array.from({length: 10}, (_, i) => pi.metadata?.[i === 0 ? 'lines' : `lines_${i + 1}`] ?? '').join(''));
  const mailing = mailingFromIntent(pi);
  if (!lines.length || !mailing || !pi.receipt_email) {
    return new Response('cannot rebuild order: missing lines, address or email', {status: 500});
  }
  const made = await createPaidOrder(env, pi, {email: pi.receipt_email, mailing, lines});
  if (!made.ok) return new Response(`order failed: ${made.message}`, {status: 500});
  return new Response(`order ${made.orderName}`, {status: 200});
}


