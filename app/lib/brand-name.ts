import {useRouteLoaderData} from 'react-router';

// Brand display name from the storefront config (served by the root loader).
export function useBrandName(fallback = 'BicycleBio'): string {
  const root = useRouteLoaderData('root') as {brandName?: string} | undefined;
  return root?.brandName ?? fallback;
}
