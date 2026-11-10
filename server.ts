import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';
import {localeRedirect} from '~/lib/i18n';

const HOOKS_HOST = 'hooks.ecombio.com';
// Paths that webhook, revalidate and cron callers use on the hooks host.
const HOOKS_ALLOWED_PREFIXES = [
  '/api/webhooks',
  '/api/revalidate-menus',
  '/api/revalidate-product',
  '/api/cron',
  '/api/yotpo/webhook',
];

function notFound(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'},
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const {pathname} = url;

    // The hooks host serves only webhook paths, never the store.
    const onHooksHost = url.hostname.toLowerCase() === HOOKS_HOST;
    if (
      onHooksHost &&
      !HOOKS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    ) {
      return notFound();
    }

    // Hydrogen's well-known proxy does not include UCP yet.
    if (pathname === '/.well-known/ucp') {
      return fetch(`https://${env.PUBLIC_STORE_DOMAIN}/.well-known/ucp`, {
        headers: {Accept: request.headers.get('Accept') ?? '*/*'},
      });
    }

    if (!onHooksHost) {
      const localeResponse = localeRedirect(request);
      if (localeResponse) return localeResponse;
    }

    // Author URLs are lowercase.
    const author = pathname.match(/^(\/[a-z]{2}-[a-z]{2})?\/blogs\/author\/([^/]+)\/?$/);
    if (author && author[2] !== author[2].toLowerCase()) {
      return new Response(null, {
        status: 308,
        headers: {
          Location: `${author[1] ?? ''}/blogs/author/${author[2].toLowerCase()}${url.search}`,
        },
      });
    }

    try {
      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      if (hydrogenContext.session.isPending) {
        // append, not set: a route may already have set the cart cookie (e.g. new cart after checkout)
        response.headers.append('Set-Cookie', await hydrogenContext.session.commit());
      }

      // Shopify URL redirects run only when the app has no page for the URL.
      if (response.status === 404) {
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
