export function localePath(path: string, params: {locale?: string}) {
  return params.locale ? `/${params.locale}${path}` : path;
}
