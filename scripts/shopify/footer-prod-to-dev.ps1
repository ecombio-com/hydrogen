# Copies the production footer menu (khkkyb-b8, handle "footer") onto the dev store's footer menu (ecombio.myshopify.com).
# Reads prod only. Backs up the dev footer first, then replaces it.
# Run with: cd C:\Users\Admin\Shopify\Storefronts\Hydrogen; .\scripts\shopify\footer-prod-to-dev.ps1
$ErrorActionPreference = 'Stop'
$ver = '2026-10'
function Get-Token($shop, $cid, $csec) {
  if (-not $cid -or -not $csec) { throw "Missing client ID/secret for $shop" }
  (Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{grant_type = 'client_credentials'; client_id = $cid; client_secret = $csec} -TimeoutSec 30).access_token
}
function Gql($s, $q, $vars) {
  $body = @{query = $q; variables = $vars} | ConvertTo-Json -Depth 30 -Compress
  $r = Invoke-RestMethod -Method Post -Uri "https://$($s.shop)/admin/api/$ver/graphql.json" -Headers @{'X-Shopify-Access-Token' = $s.token} -ContentType 'application/json' -Body $body -TimeoutSec 60
  if ($r.errors) { throw ($r.errors | ConvertTo-Json -Depth 5 -Compress) }
  $r.data
}
# Prod links point at prod pages/collections by ID. Dev can't use those IDs, so every link becomes a plain URL path.
function Url($u) { if (-not $u) { return '/' }; $p = $u -replace '^https?://([a-z0-9-]+\.myshopify\.com|(www\.)?(ecombio|bicyclebio|scooterbio|skaterbio)\.com)', ''; if (-not $p) { '/' } else { $p } }
function Conv($i) { [ordered]@{title = $i.title; type = 'HTTP'; url = (Url $i.url); items = @($i.items | Where-Object { $_ } | ForEach-Object { Conv $_ })} }

$cms = @{}
Get-Content (Join-Path $PSScriptRoot '.cms.env') | Where-Object { $_ -match '^\s*[^#=\s]+=' } | ForEach-Object { $k, $v = $_ -split '=', 2; $cms[$k.Trim()] = $v.Trim() }
$dev  = @{shop = 'ecombio.myshopify.com';   token = (Get-Token 'ecombio.myshopify.com' $cms.CMS_CLIENT_ID $cms.CMS_CLIENT_SECRET)}
$prod = @{shop = 'khkkyb-b8.myshopify.com'; token = (Get-Token 'khkkyb-b8.myshopify.com' ([Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_ID', 'User')) ([Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_SECRET', 'User')))}
Remove-Variable cms

$q = '{ menus(first: 100) { nodes { id handle title items { title type url items { title type url items { title type url } } } } } }'
$src = (Gql $prod $q @{}).menus.nodes | Where-Object handle -eq 'footer'
if (-not $src) { Write-Host 'No "footer" menu on prod.'; return }
$dst = (Gql $dev $q @{}).menus.nodes | Where-Object handle -eq 'footer'

New-Item -ItemType Directory -Force backups | Out-Null
$stamp = Get-Date -Format yyyyMMdd-HHmmss
if ($dst) { $dst | ConvertTo-Json -Depth 30 | Set-Content "backups\dev-footer-menu-$stamp.json" -Encoding UTF8; Write-Host "Dev footer backed up: backups\dev-footer-menu-$stamp.json" }

$items = @($src.items | ForEach-Object { Conv $_ })
if ($dst) {
  $m = 'mutation($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { items { title items { title url } } } userErrors { field message } } }'
  $r = (Gql $dev $m @{id = $dst.id; title = $src.title; handle = 'footer'; items = $items}).menuUpdate
} else {
  $m = 'mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) { menuCreate(title: $title, handle: $handle, items: $items) { menu { items { title items { title url } } } userErrors { field message } } }'
  $r = (Gql $dev $m @{title = $src.title; handle = 'footer'; items = $items}).menuCreate
}
if ($r.userErrors.Count) { $r.userErrors | ConvertTo-Json; return }
'Dev footer now matches prod:'
foreach ($c in $r.menu.items) { "  $($c.title)"; foreach ($l in $c.items) { "     - $($l.title)  $($l.url)" } }
