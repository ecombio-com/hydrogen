#requires -Version 7
<#
  footer-resources-links.ps1
  Sets the footer "Resources" column on khkkyb-b8 to match Back Market.
  Backs up the footer menu, then replaces ONLY the Resources links.
  Usage:
    pwsh scripts\shopify\footer-resources-links.ps1 -DryRun   # preview only
    pwsh scripts\shopify\footer-resources-links.ps1           # apply
#>
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'

$Shop        = 'khkkyb-b8.myshopify.com'
$ApiVersion  = '2026-10'
$MenuId      = 'gid://shopify/Menu/275012550744'
$ColumnTitle = 'Resources'

$NewLinks = @(
  @{ title = 'Tech Journal';         url = '/blogs/journal' }
  @{ title = 'Compare devices';      url = '/pages/compare' }
  @{ title = 'All customer reviews'; url = '/pages/reviews' }
  @{ title = 'Gift ideas';           url = '/pages/gift-ideas' }
  @{ title = 'Black Friday';         url = '/collections/black-friday' }
)

function Get-EnvVar([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($Name, 'User') }
  if (-not $v) { throw "Missing env var $Name" }
  $v
}

$tokenResponse = Invoke-RestMethod -Method Post `
  -Uri "https://$Shop/admin/oauth/access_token" `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body @{
    grant_type    = 'client_credentials'
    client_id     = Get-EnvVar 'SHOPIFY_ECOMBIOV2_CLIENT_ID'
    client_secret = Get-EnvVar 'SHOPIFY_ECOMBIOV2_CLIENT_SECRET'
  }
$Headers = @{ 'X-Shopify-Access-Token' = $tokenResponse.access_token }

function Invoke-Gql([string]$Query, [hashtable]$Variables) {
  $body = @{ query = $Query; variables = $Variables } | ConvertTo-Json -Depth 30
  $r = Invoke-RestMethod -Method Post `
    -Uri "https://$Shop/admin/api/$ApiVersion/graphql.json" `
    -Headers $Headers -ContentType 'application/json' -Body $body
  if ($r.errors) { throw ($r.errors | ConvertTo-Json -Depth 10) }
  $r.data
}

$menuQuery = 'query ($id: ID!) {
  menu(id: $id) {
    id title handle
    items { ...F items { ...F items { ...F } } }
  }
}
fragment F on MenuItem { id title type url resourceId tags }'

$menu = (Invoke-Gql $menuQuery @{ id = $MenuId }).menu
if (-not $menu) { throw "Menu $MenuId not found" }

$repoRoot  = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$backupDir = Join-Path $repoRoot 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup = Join-Path $backupDir ("footer-menu-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$menu | ConvertTo-Json -Depth 30 | Set-Content -Path $backup -Encoding utf8
Write-Host "Backup: $backup"

function ConvertTo-UpdateItem($i) {
  $o = [ordered]@{ id = $i.id; title = $i.title; type = $i.type; tags = @($i.tags) }
  if ($i.resourceId) { $o.resourceId = $i.resourceId } else { $o.url = $i.url }
  $o.items = @(@($i.items) | Where-Object { $_ } | ForEach-Object { ConvertTo-UpdateItem $_ })
  $o
}

$columns = @($menu.items | Where-Object { $_.title -eq $ColumnTitle })
if ($columns.Count -ne 1) { throw "Expected 1 top-level '$ColumnTitle' column, found $($columns.Count)." }

Write-Host "`nCurrent $ColumnTitle links (will be replaced):"
@($columns[0].items) | Where-Object { $_ } | ForEach-Object { Write-Host "  - $($_.title) -> $($_.url)" }

$items = @($menu.items | ForEach-Object {
  $u = ConvertTo-UpdateItem $_
  if ($_.title -eq $ColumnTitle) {
    $u.items = @($NewLinks | ForEach-Object {
      [ordered]@{ title = $_.title; type = 'HTTP'; url = $_.url; tags = @(); items = @() }
    })
  }
  $u
})

Write-Host "`nNew $ColumnTitle links:"
$NewLinks | ForEach-Object { Write-Host "  + $($_.title) -> $($_.url)" }

if ($DryRun) { Write-Host "`nDry run: nothing changed."; return }

$mutation = 'mutation ($id: ID!, $title: String!, $handle: String, $items: [MenuItemUpdateInput!]!) {
  menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
    menu { id items { title items { title url } } }
    userErrors { field message }
  }
}'

$result = (Invoke-Gql $mutation @{ id = $menu.id; title = $menu.title; handle = $menu.handle; items = $items }).menuUpdate
if ($result.userErrors.Count) { throw ($result.userErrors | ConvertTo-Json -Depth 10) }

Write-Host "`nUpdated. $ColumnTitle column now:"
($result.menu.items | Where-Object { $_.title -eq $ColumnTitle }).items |
  ForEach-Object { Write-Host "  $($_.title) -> $($_.url)" }
