// Sitemap output helpers.
// Why: the product sitemaps carry hreflang links in the XHTML namespace (xhtml:link). Browsers then treat the
// file as XHTML instead of XML and show every URL run together as one block of text. Google reads it fine,
// but people can't. The fix: point the file at /sitemap.xsl (a stylesheet that turns it into a readable table)
// and indent the XML so "view source" is readable too. Search engines ignore both.

const STYLESHEET = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>';

/** Adds the stylesheet line and indents the XML, two spaces per level. */
export function formatSitemap(xml: string): string {
  const tokens = xml.replace(/>\s+</g, '><').trim().split(/(<[^>]+>)/).filter((t) => t.trim() !== '');
  const out: string[] = [];
  let depth = 0;
  const pad = () => '  '.repeat(Math.max(depth, 0));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('<?xml-stylesheet')) continue; // added once below
    if (t.startsWith('<?') || t.startsWith('<!')) { out.push(t); continue; }
    if (t.startsWith('</')) { depth--; out.push(pad() + t); continue; }
    if (t.startsWith('<')) {
      const selfClosing = t.endsWith('/>');
      const text = tokens[i + 1];
      const close = tokens[i + 2];
      if (!selfClosing && text && !text.startsWith('<') && close?.startsWith('</')) {
        out.push(pad() + t + text.trim() + close); // leaf: <loc>…</loc> on one line
        i += 2;
        continue;
      }
      out.push(pad() + t);
      if (!selfClosing) depth++;
      continue;
    }
    out.push(pad() + t.trim());
  }
  const declIndex = out.findIndex((l) => l.startsWith('<?xml '));
  if (declIndex >= 0) out.splice(declIndex + 1, 0, STYLESHEET);
  else out.unshift('<?xml version="1.0" encoding="UTF-8"?>', STYLESHEET);
  return out.join('\n') + '\n';
}

/** Rebuilds a sitemap response with formatted XML, the same status and headers, and a 1-day cache. */
export async function formatSitemapResponse(response: Response, xml?: string): Promise<Response> {
  const body = formatSitemap(xml ?? (await response.text()));
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.set('Content-Type', 'application/xml; charset=utf-8');
  headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);
  return new Response(body, {status: response.status, headers});
}
