# Replaces the About us page body on khkkyb-b8 with the Back Market-style section layout.
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
<p>Ecombio is an online shop for electric bikes, electric scooters and electric skateboards. We publish buying guides so you can choose the right ride with confidence.</p>
<p>[stat: 3 | | Micro-mobility categories: e-bikes, e-scooters, e-skateboards]</p>
<p>[split: Commitments | /about/commitments.webp | | | commitments]</p>
<p>We want choosing an electric ride to be simple, honest and well informed.</p>
<p>[/split]</p>
<p>[split: Our impact | /about/impact.webp | | | our-impact-report]</p>
<p>Every e-bike, e-scooter and e-skateboard trip can replace a car trip. Our impact report is coming soon.</p>
<p>[/split]</p>
<p>[split: Newsroom | /about/newsroom.webp | | | newsroom]</p>
<p>News and press updates from Ecombio are coming soon.</p>
<p>[/split]</p>
<p>[split: Leadership | /about/leadership.webp | | | leadership]</p>
<p>Meet the team behind Ecombio. Coming soon.</p>
<p>[/split]</p>
<p>[band: contact | Contact]</p>
<p>More questions? Visit our Contact us page.</p>
<p>[/band]</p>
<p>[split: Work at Ecombio | /about/careers.webp | Join us | /pages/careers | careers]</p>
<p>Want to build the future of micro-mobility with us? See our open roles.</p>
<p>[/split]</p>
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
  $ids = [regex]::Matches($r.data.pageUpdate.page.body, '\[(?:band:\s*([a-z0-9-]+)|split:[^\]]*\|\s*([a-z0-9-]+)\s*\])') | ForEach-Object { if ($_.Groups[1].Success) { $_.Groups[1].Value } else { $_.Groups[2].Value } }
  "Updated /pages/$($r.data.pageUpdate.page.handle). Sections: $($ids -join ', ')"
}
