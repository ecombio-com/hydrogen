param([Parameter(Mandatory)][ValidateSet('dev','prod','status')]$target)
$keys = 'PUBLIC_STORE_DOMAIN','PUBLIC_CHECKOUT_DOMAIN','PUBLIC_STOREFRONT_ID','SHOP_ID',
        'PUBLIC_STOREFRONT_API_TOKEN','PRIVATE_STOREFRONT_API_TOKEN','PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID'
function Get-Val($lines, $k) {
  ($lines | Where-Object { $_ -match "^\s*$k\s*=" } | Select-Object -First 1) -replace "^\s*$k\s*=\s*", '' -replace '^["'']|["'']$', ''
}
if (-not (Test-Path .env)) { Write-Host '.env not found'; exit 1 }
$lines = Get-Content .env
$cur = Get-Val $lines 'PUBLIC_STORE_DOMAIN'
$label = if ($cur -eq 'ecombio.myshopify.com') { 'DEV store' } else { 'PRODUCTION store' }
Write-Host ".env targets: $cur ($label)"
if ($target -eq 'status') { return }

$src = if ($target -eq 'dev') { '.env.dev-store' } else { '.env.prod-ecombio' }
if ($target -eq 'prod') {
  if ((Read-Host "This points local dev at the LIVE store. Type 'live' to continue") -ne 'live') { Write-Host 'Cancelled'; return }
}
$srcLines = Get-Content $src
Copy-Item .env "$env:TEMP\env-backup-$(Get-Date -Format yyyyMMdd-HHmmss).bak" -Force
foreach ($k in $keys) {
  $v = Get-Val $srcLines $k
  if (-not $v) { Write-Warning "$src has no $k - left unchanged"; continue }
  $found = $false
  $lines = foreach ($l in $lines) { if ($l -match "^\s*$k\s*=") { $found = $true; "$k=$v" } else { $l } }
  if (-not $found) { $lines = @($lines) + "$k=$v" }
}
Set-Content .env $lines
Write-Host "Now targeting: $(Get-Val $lines 'PUBLIC_STORE_DOMAIN'). Restart the dev server."
