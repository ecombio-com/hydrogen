#requires -Version 7
<#
  footer-law-links.ps1
  Moves the policy links (from a footer backup's Resources column) into "Law and order",
  keeps Law and order's current links (skips duplicate URLs), and removes the empty
  top-level "Your Privacy Choices" item. Backs up the menu first.
  Usage:
    pwsh scripts\shopify\footer-law-links.ps1 -DryRun
    pwsh scripts\shopify\footer-law-links.ps1
#>
param(
  [switch]$DryRun, [switch]$SkipAdd,
  [string]$SourceBackup = 'backups\footer-menu-20261111-181532.json'
)
$ErrorActionPreference = 'Stop'

$Shop        = 'khkkyb-b8.myshopify.com'
$ApiVersion  = '2026-10'
$MenuId      = 'gid://shopify/Menu/275012550744'
$TargetTitle = 'Law and order'
$DropTitle   = 'Your Privacy Choices'

function Get-EnvVar([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($Name, 'User') }
  if (-not $v) { throw "Missing env var $Name" }
  $v
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$srcPath  = Join-Path $repoRoot $SourceBackup
$src      = Get-Content $srcPath -Raw | ConvertFrom-Json
$policies = @(($src.items | Where-Object { $_.title -eq 'Resources' }).items) | Where-Object { $_ }
if (-not $policies) { throw "No Resources links found in $srcPath" }

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

$backupDir = Join-Path $repoRoot 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup = Join-Path $backupDir ("footer-menu-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$menu | ConvertTo-Json -Depth 30 | Set-Content -Path $backup -Encoding utf8
Write-Host "Backup: $backup"

function ConvertTo-UpdateItem($i, [switch]$New) {
  $o = [ordered]@{ title = $i.title; type = $i.type; tags = @($i.tags) }
  if (-not $New) { $o.id = $i.id }
  if ($i.resourceId) { $o.resourceId = $i.resourceId } else { $o.url = $i.url }
  $o.items = @(@($i.items) | Where-Object { $_ } | ForEach-Object { ConvertTo-UpdateItem $_ -New:$New })
  $o
}

$target = @($menu.items | Where-Object { $_.title -eq $TargetTitle })
if ($target.Count -ne 1) { throw "Expected 1 '$TargetTitle' column, found $($target.Count)." }

$current = @($target[0].items) | Where-Object { $_ }
Write-Host "`nCurrent $TargetTitle links:"
$current | ForEach-Object { Write-Host "  = $($_.title) -> $($_.url)" }

$seen  = @{}
$merged = @()
foreach ($c in $current) { $seen[$c.url] = $true; $merged += ,(ConvertTo-UpdateItem $c) }
Write-Host "`nAdding:"
foreach ($p in $(if ($SkipAdd) { @() } else { $policies })) {
  if ($seen.ContainsKey($p.url)) { Write-Host "  (skip duplicate) $($p.title) -> $($p.url)"; continue }
  $seen[$p.url] = $true
  $merged += ,(ConvertTo-UpdateItem $p -New)
  Write-Host "  + $($p.title) -> $($p.url)"
}

$items = @($menu.items | Where-Object { $_.title -ne $DropTitle } | ForEach-Object {
  $u = ConvertTo-UpdateItem $_
  if ($_.title -eq $TargetTitle) { $u.items = $merged }
  $u
})
if (@($menu.items | Where-Object { $_.title -eq $DropTitle }).Count) { Write-Host "`nRemoving top-level item: $DropTitle" }

if ($DryRun) { Write-Host "`nDry run: nothing changed."; return }

$mutation = 'mutation ($id: ID!, $title: String!, $handle: String, $items: [MenuItemUpdateInput!]!) {
  menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
    menu { id items { title items { title url } } }
    userErrors { field message }
  }
}'

$result = (Invoke-Gql $mutation @{ id = $menu.id; title = $menu.title; handle = $menu.handle; items = $items }).menuUpdate
if ($result.userErrors.Count) { throw ($result.userErrors | ConvertTo-Json -Depth 10) }

Write-Host "`nUpdated. Columns now:"
$result.menu.items | ForEach-Object { Write-Host ("  {0} ({1} links)" -f $_.title, @($_.items).Count) }
Write-Host "`n$TargetTitle now:"
($result.menu.items | Where-Object { $_.title -eq $TargetTitle }).items |
  ForEach-Object { Write-Host "  $($_.title) -> $($_.url)" }

