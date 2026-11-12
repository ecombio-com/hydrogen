# Creates/updates /pages/military-program (GovX ID) and updates footer Services links on khkkyb-b8 (backs up first).
# Run with: . .\scripts\shopify\military-program.ps1   (logs in from user env vars)
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
New-Item -ItemType Directory -Force backups | Out-Null
$stamp = Get-Date -Format yyyyMMdd-HHmmss

# ---- 1. Page ----
$handle = 'military-program'
$govx = 'https://auth.govx.com/shopify/verify?shop=khkkyb-b8.myshopify.com&utm_source=shopify&utm_medium=govxid&utm_campaign=custom_link'
$body = @"
<h2>Thank you for your service: 10% off everything</h2>
<p>Military members, veterans, military families, and first responders (fire, police, healthcare workers) get 10% off e-bikes, e-scooters, and electric skateboards.</p>
<p><a href="$govx" target="_blank" rel="noopener">Verify with GOVX</a></p>
<h3>How it works</h3>
<ol>
<li><strong>Verify.</strong> Confirm your status with GOVX ID. It takes about a minute.</li>
<li><strong>Get your code.</strong> GOVX gives you a unique, single-use code.</li>
<li><strong>Save 10%.</strong> Enter the code at checkout.</li>
</ol>
<h3>The fine print</h3>
<ul>
<li>10% off all products. No minimum purchase.</li>
<li>Eligible: active duty and veterans, military spouses and dependents, and first responders (fire, police, healthcare workers).</li>
<li>Verification is handled by GOVX ID. Codes are unique and single-use.</li>
<li>One code per customer every 24 hours.</li>
</ul>
<p>Questions? <a href="https://help.ecombio.com">Visit our Help Center</a>.</p>
"@
$found = (Gql "{ pages(first: 1, query: `"handle:$handle`") { nodes { id handle body } } }" @{}).data.pages.nodes | Select-Object -First 1
if ($found) {
  $found.body | Set-Content "backups\$handle-body-$stamp.html"
  $pr = Gql 'mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id handle title } userErrors { field message } } }' @{id = $found.id; page = @{title = 'Military & First Responders'; body = $body; isPublished = $true}}
  $pp = $pr.data.pageUpdate
} else {
  $pr = Gql 'mutation($page: PageCreateInput!) { pageCreate(page: $page) { page { id handle title } userErrors { field message } } }' @{page = @{title = 'Military & First Responders'; handle = $handle; body = $body; isPublished = $true}}
  $pp = $pr.data.pageCreate
}
if ($pr.errors) { $pr.errors | ConvertTo-Json -Depth 5; return }
if ($pp.userErrors.Count) { $pp.userErrors | ConvertTo-Json; return }
Write-Host 'PAGE:'; $pp.page | ConvertTo-Json

# ---- 2. Footer menu ----
$menuId = 'gid://shopify/Menu/275012550744'
$m = (Gql "{ menu(id: `"$menuId`") { title handle items { id title type url resourceId items { id title type url resourceId } } } }" @{}).data.menu
if (-not $m) { Write-Host 'Could not read the footer menu.'; return }
$m | ConvertTo-Json -Depth 20 | Set-Content "backups\footer-menu-$stamp.json"
$drop = @('Trade-in', 'Trade-in Terms and Conditions')
function Conv($i) {
  $o = [ordered]@{id = $i.id; title = $i.title; type = $i.type; url = $i.url}
  if ($i.resourceId) { $o.resourceId = $i.resourceId }
  if ($i.title -eq 'Military program') { $o.title = 'Military & First Responders' }
  $o.items = @($i.items | Where-Object { $_ -and ($drop -notcontains $_.title) } | ForEach-Object { Conv $_ })
  return $o
}
$items = @($m.items | ForEach-Object { Conv $_ })
$r = Gql 'mutation($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { items { title items { title url } } } userErrors { field message } } }' @{id = $menuId; title = $m.title; handle = $m.handle; items = $items}
if ($r.errors) { $r.errors | ConvertTo-Json -Depth 5 }
elseif ($r.data.menuUpdate.userErrors.Count) { $r.data.menuUpdate.userErrors | ConvertTo-Json }
else { Write-Host 'MENU:'; $r.data.menuUpdate.menu.items | Where-Object { $_.title -in @('Services', 'Law and order') } | ConvertTo-Json -Depth 5 }
