# Rewrites /pages/military-program on khkkyb-b8 with layout shortcodes (Back Market layout). Backs up the old body first.
# Run with: . .\scripts\shopify\military-program-page.ps1   (logs in from user env vars)
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
function Gql($query, $vars) { $b = @{query = $query; variables = $vars} | ConvertTo-Json -Depth 20; Invoke-RestMethod -Method Post -Uri $api -Headers $h -ContentType 'application/json' -Body $b -TimeoutSec 30 }
$pageId = 'gid://shopify/Page/167382614104'
$govx = 'https://auth.govx.com/shopify/verify?shop=khkkyb-b8.myshopify.com&utm_source=shopify&utm_medium=govxid&utm_campaign=custom_link'
$body = @"
<p>[hero: Military, veterans, first responders &amp; their families get 10% off]</p>
<p>[pill: Verify with GOVX | $govx]</p>
<p>[stat: 1 | | Verify your status with GOVX in about a minute]</p>
<p>[stat: 2 | | Get your unique, single-use code]</p>
<p>[stat: 3 | | Enter it at checkout and save 10%]</p>
<p>[band: fine-print | The fine print]</p>
<p>10% off all products, with no minimum purchase. Open to active duty military and veterans, military spouses and dependents, and first responders (fire, police, healthcare workers). Verification is handled by GOVX ID. Each verified customer gets a unique, single-use code. One code per customer every 24 hours.</p>
<p>[/band]</p>
<p>[pill: Verify with GOVX | $govx]</p>
<p>[pill: Questions? Visit our Help Center | /pages/help-center]</p>
"@
$old = (Gql "{ page(id: `"$pageId`") { body } }" @{}).data.page
if (-not $old) { Write-Host 'Could not read the page.'; return }
New-Item -ItemType Directory -Force backups | Out-Null
$old.body | Set-Content "backups\military-program-body-$(Get-Date -Format yyyyMMdd-HHmmss).html"
$r = Gql 'mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id handle title } userErrors { field message } } }' @{id = $pageId; page = @{body = $body}}
if ($r.errors) { $r.errors | ConvertTo-Json -Depth 5 }
elseif ($r.data.pageUpdate.userErrors.Count) { $r.data.pageUpdate.userErrors | ConvertTo-Json }
else { Write-Host 'PAGE UPDATED:'; $r.data.pageUpdate.page | ConvertTo-Json }
