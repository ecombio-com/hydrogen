# Replaces the About us page body on khkkyb-b8 with the Back Market-style layout (demo data).
# Run with: . .\scripts\shopify\about-us-page.ps1   (logs in from user env vars)
$shop = 'khkkyb-b8.myshopify.com'
if (-not $t) {
  $cid = [Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_ID', 'User')
  $csec = [Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_SECRET', 'User')
  if (-not $cid -or -not $csec) { Write-Host 'Missing SHOPIFY_ECOMBIOV2_CLIENT_ID / SHOPIFY_ECOMBIOV2_CLIENT_SECRET user env vars.'; return }
  $t = (Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{grant_type = 'client_credentials'; client_id = $cid; client_secret = $csec} -TimeoutSec 30).access_token
  Remove-Variable csec
  if (-not $t) { Write-Host 'Login failed. Check the two env vars.'; return }
}
$api = "https://$shop/admin/api/2026-10/graphql.json"
$h = @{'X-Shopify-Access-Token' = $t}
$pageId = 'gid://shopify/Page/167382876248'

$pageBody = @'
<p>[hero: About us | /about/hero.webp]</p>
<p>[pill: Commitments | #commitments]</p>
<p>[pill: Newsroom | #newsroom]</p>
<p>[pill: Leadership | #leadership]</p>
<p>[pill: Contact | #contact]</p>
<p>Ecombio is an online shop for electric bikes, electric scooters and electric skateboards. We sell direct, publish honest buying guides and help you choose the right ride with confidence.</p>
<p>[stat: 00 | % | Demo stat one]</p>
<p>[stat: 0 | k | Demo stat two]</p>
<p>[stat: 00.0 |  | Demo stat three]</p>
<p>[band: commitments | Commitments]</p>
<p>We choose partners carefully and measure the impact of every ride we sell.</p>
<p>[/band]</p>
<p>[split: Commitment one | /about/demo/commitment-1.webp | Take action | /blogs]</p>
<p>Demo text. A short line about the first commitment and why it matters to riders.</p>
<p>[/split]</p>
<p>[split: Commitment two | /about/demo/commitment-2.webp | Read more | /blogs]</p>
<p>Demo text. A short line about the second commitment.</p>
<p>[/split]</p>
<p>[split: Commitment three | /about/demo/commitment-3.webp | Read more | /blogs]</p>
<p>Demo text. A short line about the third commitment.</p>
<p>[/split]</p>
<p>[split: Our impact report | /about/demo/impact-report.webp | Read more | /blogs | our-impact-report | | Our Impact Report]</p>
<p>Demo text. Our first impact report looks at what changes when a car trip becomes an e-bike, e-scooter or e-skateboard trip.</p>
<p>[/split]</p>
<p>[split: Certification | /about/demo/certification.webp | Read more | /blogs]</p>
<p>Demo text. A short line about a standard or certification we hold.</p>
<p>[/split]</p>
<p>[band: newsroom | Newsroom]</p>
<p>Stay up to date with our latest news and stories.</p>
<p>[/band]</p>
<p>[cards: article | Latest News | Press releases, partnerships and more. | latest-news]</p>
<p>[card: /about/demo/news-1.webp | Demo news headline 1 | Press releases | /blogs]</p>
<p>[card: /about/demo/news-2.webp | Demo news headline 2 | Press releases | /blogs]</p>
<p>[card: /about/demo/news-3.webp | Demo news headline 3 | Press releases | /blogs]</p>
<p>[card: /about/demo/news-4.webp | Demo news headline 4 | Press releases | /blogs]</p>
<p>[card: /about/demo/news-5.webp | Demo news headline 5 | Press releases | /blogs]</p>
<p>[card: /about/demo/news-6.webp | Demo news headline 6 | Press releases | /blogs]</p>
<p>[/cards]</p>
<p>[cards: article | Industry Insights | Buying guides, riding tips and more. | industry-insights]</p>
<p>[card: /about/demo/insight-1.webp | Demo article title 1 | Buying guides | /blogs]</p>
<p>[card: /about/demo/insight-2.webp | Demo article title 2 | Riding tips | /blogs]</p>
<p>[card: /about/demo/insight-3.webp | Demo article title 3 | News | /blogs]</p>
<p>[card: /about/demo/insight-4.webp | Demo article title 4 | Maintenance | /blogs]</p>
<p>[card: /about/demo/insight-5.webp | Demo article title 5 | Safety | /blogs]</p>
<p>[/cards]</p>
<p>[cards: press | As seen in | | as-seen-in]</p>
<p>[card: /about/demo/outlet-1.webp | Demo press quote about Ecombio number 1 | 01/01/26 | ]</p>
<p>[card: /about/demo/outlet-2.webp | Demo press quote about Ecombio number 2 | 01/02/26 | ]</p>
<p>[card: /about/demo/outlet-3.webp | Demo press quote about Ecombio number 3 | 01/03/26 | ]</p>
<p>[card: /about/demo/outlet-4.webp | Demo press quote about Ecombio number 4 | 01/04/26 | ]</p>
<p>[card: /about/demo/outlet-5.webp | Demo press quote about Ecombio number 5 | 01/05/26 | ]</p>
<p>[card: /about/demo/outlet-6.webp | Demo press quote about Ecombio number 6 | 01/06/26 | ]</p>
<p>[card: /about/demo/outlet-7.webp | Demo press quote about Ecombio number 7 | 01/07/26 | ]</p>
<p>[card: /about/demo/outlet-8.webp | Demo press quote about Ecombio number 8 | 01/08/26 | ]</p>
<p>[/cards]</p>
<p>[split: Press kit | /about/demo/press-kit.webp | Download press kit | /pages/contact | press-kit | right]</p>
<p>Demo text. Logos, photos and facts you need to write about Ecombio.</p>
<p>[/split]</p>
<p>[band: leadership | Leadership]</p>
<p>Our team and board.</p>
<p>[/band]</p>
<p>[cards: person | Leadership Team | Our leaders and experts. | leadership-team]</p>
<p>[card: /about/demo/leader-1.webp | Leader name 1 | Chief Executive Officer | ]</p>
<p>[card: /about/demo/leader-2.webp | Leader name 2 | Chief Operating Officer | ]</p>
<p>[card: /about/demo/leader-3.webp | Leader name 3 | Chief Financial Officer | ]</p>
<p>[card: /about/demo/leader-4.webp | Leader name 4 | Chief Technology Officer | ]</p>
<p>[card: /about/demo/leader-5.webp | Leader name 5 | Chief Commercial Officer | ]</p>
<p>[card: /about/demo/leader-6.webp | Leader name 6 | Chief Marketing Officer | ]</p>
<p>[card: /about/demo/leader-7.webp | Leader name 7 | Chief People Officer | ]</p>
<p>[card: /about/demo/leader-8.webp | Leader name 8 | Chief Legal Officer | ]</p>
<p>[/cards]</p>
<p>[cards: person | Our Founders | | our-founders]</p>
<p>[card: /about/demo/founder-1.webp | Founder name 1 | Co-founder | ]</p>
<p>[card: /about/demo/founder-2.webp | Founder name 2 | Co-founder | ]</p>
<p>[card: /about/demo/founder-3.webp | Founder name 3 | Co-founder | ]</p>
<p>[/cards]</p>
<p>[cards: logo | Our Investors | Demo text about the investors who back our mission. | our-investors]</p>
<p>[card: /about/demo/investor-1.webp | Investor 1 | | ]</p>
<p>[card: /about/demo/investor-2.webp | Investor 2 | | ]</p>
<p>[card: /about/demo/investor-3.webp | Investor 3 | | ]</p>
<p>[card: /about/demo/investor-4.webp | Investor 4 | | ]</p>
<p>[card: /about/demo/investor-5.webp | Investor 5 | | ]</p>
<p>[card: /about/demo/investor-6.webp | Investor 6 | | ]</p>
<p>[card: /about/demo/investor-7.webp | Investor 7 | | ]</p>
<p>[/cards]</p>
<p>[band: contact | Contact]</p>
<p>More questions? Contact us.</p>
<p>[/band]</p>
<p>[pill: Press inquiries | /pages/contact]</p>
<p>[pill: Instagram | https://www.instagram.com/]</p>
<p>[pill: X | https://x.com/]</p>
<p>[pill: LinkedIn | https://www.linkedin.com/]</p>
<p>[pill: YouTube | https://www.youtube.com/]</p>
<p>[split: Work at Ecombio | /about/demo/careers.webp | Join us | /pages/careers | careers | right]</p>
<p>Looking for work that fits your values? See our open roles and apply.</p>
<p>[/split]</p>
<p>[cards: logo | Our Partners | Demo text about the brands and groups we partner with. | our-partners]</p>
<p>[card: /about/demo/partner-1.webp | Partner 1 | | ]</p>
<p>[card: /about/demo/partner-2.webp | Partner 2 | | ]</p>
<p>[card: /about/demo/partner-3.webp | Partner 3 | | ]</p>
<p>[card: /about/demo/partner-4.webp | Partner 4 | | ]</p>
<p>[/cards]</p>
'@

# Back up the current body first
$rq = @{query = "{ page(id: `"$pageId`") { body } }"} | ConvertTo-Json
$old = (Invoke-RestMethod -Method Post -Uri $api -Headers $h -ContentType 'application/json' -Body $rq -TimeoutSec 30).data.page.body
New-Item -ItemType Directory -Force .\backups | Out-Null
$backup = ".\backups\about-us-body-$(Get-Date -Format yyyyMMdd-HHmmss).html"
Set-Content -Path $backup -Value $old -Encoding utf8
Write-Host "Backup: $backup"

$mutation = 'mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { handle body } userErrors { field message } } }'
$body = @{query = $mutation; variables = @{id = $pageId; page = @{body = $pageBody}}} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Method Post -Uri $api -Headers $h -ContentType 'application/json' -Body $body -TimeoutSec 30

if ($r.errors) { $r.errors | ConvertTo-Json -Depth 5 }
elseif ($r.data.pageUpdate.userErrors.Count) { $r.data.pageUpdate.userErrors | ConvertTo-Json }
else {
  $n = ([regex]::Matches($r.data.pageUpdate.page.body, '\[(hero|band|split|cards|stat):')).Count
  "Updated /pages/$($r.data.pageUpdate.page.handle): $n blocks."
}
