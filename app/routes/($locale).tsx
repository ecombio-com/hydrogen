import type {LoaderFunctionArgs} from 'react-router';
import {isEnabledLocale} from '~/lib/i18n';

// Unknown or disabled locale prefixes (e.g. /zz-zz) return 404.
export async function loader({params}: LoaderFunctionArgs) {
  if (params.locale && !isEnabledLocale(params.locale)) {
    throw new Response(null, {status: 404});
  }
  return null;
}
