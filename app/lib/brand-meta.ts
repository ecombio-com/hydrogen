// Brand name for meta() functions: the root loader already returns it, so no per-route loader change is needed.
export function brandNameFromMatches(
  matches: ReadonlyArray<{id?: string; data?: unknown} | undefined>,
): string {
  const root = matches.find((m) => m?.id === 'root');
  const name = (root?.data as {brandName?: unknown} | undefined)?.brandName;
  return typeof name === 'string' && name ? name : 'Ecombio';
}