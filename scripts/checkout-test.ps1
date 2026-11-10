# Checkout test, terminal only. Needs `pnpm dev --port 3000` running in another terminal.
# Prints PASS/FAIL per step. Never prints tokens. Uses a fake buyer.
$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:3000'
$Jar  = Join-Path $env:TEMP 'checkout-test-cookies.txt'
Remove-Item $Jar -ErrorAction SilentlyContinue

function Check($name, $ok, $info = '') {
  if ($ok) { Write-Host "PASS  $name  $info" -ForegroundColor Green }
  else     { Write-Host "FAIL  $name  $info" -ForegroundColor Red }
}
function Hit([string]$method, [string]$path, [string[]]$form = @()) {
  $cargs = @('-s', '-o', "$env:TEMP\ct-body.txt", '-w', '%{http_code} %{redirect_url}', '-c', $Jar, '-b', $Jar, '-X', $method)
  foreach ($f in $form) { $cargs += @('--data-urlencode', $f) }
  $out = & curl.exe @cargs ($Base + $path)
  $code, $loc = $out -split ' ', 2
  [pscustomobject]@{ Code = [int]$code; Location = $loc; Body = (Get-Content "$env:TEMP\ct-body.txt" -Raw -ErrorAction SilentlyContinue) }
}
function EnvVal($key) {
  $line = Get-Content .env | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if ($line) { ($line -split '=', 2)[1].Trim().Trim('"') } else { $null }
}
$Domain = EnvVal 'PUBLIC_STORE_DOMAIN'
$Token  = EnvVal 'PUBLIC_STOREFRONT_API_TOKEN'
$SfUrl  = "https://$Domain/api/2026-10/graphql.json"
function Sf($query, $vars = @{}) {
  $body = @{ query = $query; variables = $vars } | ConvertTo-Json -Depth 10 -Compress
  Invoke-RestMethod -Method Post -Uri $SfUrl -ContentType 'application/json' -Headers @{ 'X-Shopify-Storefront-Access-Token' = $Token } -Body $body
}
function CartGid {
  $line = Get-Content $Jar | Where-Object { $_ -match "`tcart`t" } | Select-Object -Last 1
  if ($line) { 'gid://shopify/Cart/' + [uri]::UnescapeDataString(($line -split "`t")[-1]) } else { $null }
}

Write-Host "`n== 1. Find an in-stock variant ==" -ForegroundColor Cyan
$p = Sf 'query { products(first: 20) { nodes { title variants(first: 5) { nodes { id availableForSale } } } } }'
$v = $p.data.products.nodes | ForEach-Object { $t = $_.title; $_.variants.nodes | Where-Object availableForSale | ForEach-Object { [pscustomobject]@{ Title = $t; Id = $_.id } } } | Select-Object -First 1
Check 'variant found' ($null -ne $v) $v.Title
$vid = $v.Id.Split('/')[-1]

Write-Host "`n== 2. Cart ==" -ForegroundColor Cyan
$r = Hit GET "/en-us/cart/${vid}:1"
Check 'cart created (302 to checkout)' ($r.Code -eq 302) ("$($r.Code)")
$cartId = CartGid
Check 'cart cookie set' ($null -ne $cartId)

Write-Host "`n== 3. Address ==" -ForegroundColor Cyan
$r = Hit GET '/en-us/address'
Check 'address page loads' ($r.Code -eq 200) "$($r.Code)"
$form = @('email=test.buyer@example.com','firstName=Test','lastName=Buyer','address1=1 Infinite Loop','address2=','city=Cupertino','state=CA','zip=95014','phone=4085551234')
$r = Hit POST '/en-us/address' $form
Check 'address saved, redirect to /payment' ($r.Code -in 302,303 -and $r.Location -match '/payment') "$($r.Code) $($r.Location)"

$c = Sf 'query($id: ID!) { cart(id: $id) { buyerIdentity { email } attributes { key value } delivery { addresses { selected address { ... on CartDeliveryAddress { address1 city provinceCode zip } } } } } }' @{ id = $cartId }
$cart = $c.data.cart
Check 'Shopify cart has email' ($cart.buyerIdentity.email -eq 'test.buyer@example.com') $cart.buyerIdentity.email
$addr = ($cart.delivery.addresses | Where-Object selected | Select-Object -First 1).address
Check 'Shopify cart has address' ($addr.address1 -eq '1 Infinite Loop' -and $addr.provinceCode -eq 'CA') "$($addr.address1), $($addr.city) $($addr.provinceCode)"
$sid = ($cart.attributes | Where-Object key -eq 'storefront_id').value
Check 'cart tagged storefront_id' ([bool]$sid) $sid

Write-Host "`n== 4. Payment ==" -ForegroundColor Cyan
$r = Hit GET '/en-us/payment'
Check 'payment page loads' ($r.Code -eq 200) "$($r.Code)"
$r = Hit GET '/api/checkout-url'
$url = ($r.Body | ConvertFrom-Json).url
Check 'checkout URL returned' ([bool]$url) $(if ($url) { ([uri]$url).Host } else { $r.Code })
$r = Hit GET '/api/checkout-status'
Check 'status before paying = not completed' ($r.Code -eq 200 -and ($r.Body | ConvertFrom-Json).completed -eq $false) "$($r.Code) $($r.Body)"

Write-Host "`n== 5. Pay (the only manual step) ==" -ForegroundColor Cyan
Write-Host 'Opening Shopify checkout. Address should be prefilled. Pay with the test card (Bogus gateway: card number 1).'
Start-Process $url
Read-Host 'After the order is placed, press Enter here'

Write-Host "`n== 6. After payment ==" -ForegroundColor Cyan
$r = Hit GET '/api/checkout-status'
Check 'status after paying = completed (close fallback works)' (($r.Body | ConvertFrom-Json).completed -eq $true) $r.Body
$old = $cartId
$paid = (($r.Body | ConvertFrom-Json).completed -eq $true)
$r = Hit GET '/en-us/payment/complete?kit=1'
if ($paid) { Check 'thank-you page loads' ($r.Code -eq 200) "$($r.Code)" }
else { Check 'unpaid: thank-you page refuses (redirect)' ($r.Code -in 302,303) "$($r.Code) $($r.Location)"; Write-Host 'No order was placed. Re-run the script and pay before pressing Enter.' -ForegroundColor Yellow; return }
$new = CartGid
Check 'new cart cookie set (cart cleared)' ($new -and $new -ne $old)
$r = Hit GET '/api/checkout-url'
Check 'new cart is empty' ($null -eq ($r.Body | ConvertFrom-Json).url)
Write-Host "`nDone. Check the order in Shopify admin, then refund/cancel it." -ForegroundColor Cyan
