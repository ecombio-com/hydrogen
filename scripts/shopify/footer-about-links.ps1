# Updates the About column links in the footer menu on khkkyb-b8.
# Run with: . .\scripts\shopify\footer-about-links.ps1   (logs in from user env vars)
$shop = 'khkkyb-b8.myshopify.com'
if (-not $t) {
  # ECOMBIOv2 login from Windows user env vars (set once, reused everywhere).
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
$fix = @{
  'Press'      = '/pages/about-us#newsroom'
  'Our impact' = '/pages/about-us#our-impact-report'
}

$rq = @{query = "{ menu(id: `"$menuId`") { title handle items { id title type url resourceId items { id title type url resourceId } } } }"} | ConvertTo-Json
$m = (Invoke-RestMethod -Method Post -Uri $api -Headers $h -ContentType 'application/json' -Body $rq -TimeoutSec 30).data.menu
if (-not $m) { Write-Host 'Could not read the footer menu.'; return }

function Conv($i, $col) {
  $o = [ordered]@{id = $i.id; title = $i.title; type = $i.type; url = $i.url}
  if ($i.resourceId) { $o.resourceId = $i.resourceId }
  if ($col -eq 'About' -and $fix.ContainsKey($i.title)) {
    $o.type = 'HTTP'; $o.url = $fix[$i.title]; $o.Remove('resourceId')
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
else { $r.data.menuUpdate.menu.items | Where-Object title -eq 'About' | ConvertTo-Json -Depth 5 }
