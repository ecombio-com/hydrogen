# Replaces the Help column links in the footer menu on khkkyb-b8 (backs up the menu first).
# Run with: . .\scripts\shopify\footer-help-links.ps1   (logs in from user env vars)
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
$menuId = 'gid://shopify/Menu/275012550744'
$help = @(
  @{title = 'Contact us';          url = 'https://help.ecombio.com/en/collections/19809245-contact-and-support'}
  @{title = 'Help Center';         url = '/pages/help-center'}
  @{title = 'Shipping';            url = 'https://help.ecombio.com/en/collections/19809241-shipping-and-delivery'}
  @{title = 'Returns and refunds'; url = 'https://help.ecombio.com/en/collections/19809242-returns-and-refunds'}
)

$rq = @{query = "{ menu(id: `"$menuId`") { title handle items { id title type url resourceId items { id title type url resourceId } } } }"} | ConvertTo-Json
$m = (Invoke-RestMethod -Method Post -Uri $api -Headers $h -ContentType 'application/json' -Body $rq -TimeoutSec 30).data.menu
if (-not $m) { Write-Host 'Could not read the footer menu.'; return }
if (-not ($m.items.title -contains 'Help')) { Write-Host 'No Help column found. Columns:'; $m.items.title; return }

New-Item -ItemType Directory -Force backups | Out-Null
$m | ConvertTo-Json -Depth 20 | Set-Content "backups\footer-menu-$(Get-Date -Format yyyyMMdd-HHmmss).json"

function Conv($i, $col) {
  $o = [ordered]@{id = $i.id; title = $i.title; type = $i.type; url = $i.url}
  if ($i.resourceId) { $o.resourceId = $i.resourceId }
  if ($col -eq '' -and $i.title -eq 'Help') {
    $o.items = @($help | ForEach-Object { [ordered]@{title = $_.title; type = 'HTTP'; url = $_.url; items = @()} })
    return $o
  }
  $o.items = @($i.items | Where-Object { $_ } | ForEach-Object { Conv $_ $i.title })
  return $o
}
$items = @($m.items | ForEach-Object { Conv $_ '' })

$mutation = 'mutation($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { items { title items { title url } } } userErrors { field message } } }'
$body = @{query = $mutation; variables = @{id = $menuId; title = $m.title; handle = $m.handle; items = $items}} | ConvertTo-Json -Depth 20
$r = Invoke-RestMethod -Method Post -Uri $api -Headers $h -ContentType 'application/json' -Body $body -TimeoutSec 30

if ($r.errors) { $r.errors | ConvertTo-Json -Depth 5 }
elseif ($r.data.menuUpdate.userErrors.Count) { $r.data.menuUpdate.userErrors | ConvertTo-Json }
else { $r.data.menuUpdate.menu.items | Where-Object title -eq 'Help' | ConvertTo-Json -Depth 5 }

