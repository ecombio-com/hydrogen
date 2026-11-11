import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com'],
    scriptSrc: ["'self'", 'https://cdn.shopify.com', 'https://www.googletagmanager.com', 'https://js.stripe.com', 'https://*.js.stripe.com', 'https://maps.googleapis.com'],
    connectSrc: [
      "'self'",
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://insights.algolia.io',
      'https://api.stripe.com',
      'https://maps.googleapis.com',
    ],
    mediaSrc: ["'self'", 'https://cdn.shopify.com'],
    imgSrc: ["'self'", 'data:', 'https://cdn.shopify.com', 'https://*.google-analytics.com', 'https://*.stripe.com', 'https://*.yotpo.com', 'https://*.kaltura.com'],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
