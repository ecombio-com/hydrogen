// /sitemap.xsl: turns the XML sitemaps into a readable page in the browser. Search engines ignore it.
// Served from a route (not public/) so the Content-Type is always text/xsl, which browsers require.
export function loader() {
  return new Response(SITEMAP_XSL, {
    status: 200,
    headers: {'Content-Type': 'text/xsl; charset=utf-8', 'Cache-Control': `max-age=${60 * 60 * 24}`},
  });
}

const SITEMAP_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="s xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Sitemap</title>
        <style>
          body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; background: #fafafa; }
          main { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          p { margin: 0 0 24px; color: #666; }
          .card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-weight: 500; font-size: 12px; color: #666; background: #f5f5f5; padding: 10px 16px; border-bottom: 1px solid #eaeaea; }
          td { padding: 10px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
          tr:last-child td { border-bottom: 0; }
          td.n { width: 48px; color: #999; }
          td.d, th.d { width: 120px; white-space: nowrap; color: #666; }
          td.l, th.l { width: 90px; text-align: right; color: #666; }
          a { color: #111; text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <main>
          <xsl:choose>
            <xsl:when test="s:sitemapindex">
              <h1>Sitemap index</h1>
              <p><xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> sitemaps</p>
              <div class="card"><table>
                <tr><th>#</th><th>Sitemap</th><th class="d">Last modified</th></tr>
                <xsl:for-each select="s:sitemapindex/s:sitemap">
                  <tr>
                    <td class="n"><xsl:value-of select="position()"/></td>
                    <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                    <td class="d"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                  </tr>
                </xsl:for-each>
              </table></div>
            </xsl:when>
            <xsl:otherwise>
              <h1>Sitemap</h1>
              <p><xsl:value-of select="count(s:urlset/s:url)"/> URLs</p>
              <div class="card"><table>
                <tr><th>#</th><th>URL</th><th class="d">Last modified</th><th class="l">Languages</th></tr>
                <xsl:for-each select="s:urlset/s:url">
                  <tr>
                    <td class="n"><xsl:value-of select="position()"/></td>
                    <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                    <td class="d"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                    <td class="l"><xsl:value-of select="count(xhtml:link)"/></td>
                  </tr>
                </xsl:for-each>
              </table></div>
            </xsl:otherwise>
          </xsl:choose>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`;
