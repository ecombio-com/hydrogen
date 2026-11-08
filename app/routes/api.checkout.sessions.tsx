import type {ActionFunctionArgs} from 'react-router';
import {VERSIONS} from '~/lib/versions';
import {allowedOrigins, createCheckoutSession, type SessionInput} from '~/lib/checkout-session.server';

export function loader() {
  return new Response('Method not allowed', {status: 405});
}

// Snippet sends Content-Type: text/plain so the browser skips the CORS preflight.
export async function action({request, context}: ActionFunctionArgs) {
  const env = context.env as unknown as Record<string, string | undefined>;
  const origin = request.headers.get('origin');
  const ok = origin && allowedOrigins(env).includes(origin);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Vary: 'Origin',
    'X-Checkout-Api-Version': VERSIONS.checkoutApi,
  };
  if (ok) headers['Access-Control-Allow-Origin'] = origin;
  if (origin && !ok) return new Response(JSON.stringify({error: 'origin not allowed'}), {status: 403, headers});

  let input: SessionInput;
  try {
    input = JSON.parse(await request.text()) as SessionInput;
  } catch {
    return new Response(JSON.stringify({error: 'bad json'}), {status: 400, headers});
  }
  const result = await createCheckoutSession(context.storefront as any, env, input);
  return new Response(JSON.stringify(result.body), {status: result.status, headers});
}

