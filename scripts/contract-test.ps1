$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path "Env:$($Matches[1])" -Value ($Matches[2].Trim('"').Trim("'")) }
}
$adminVer = [regex]::Match((Get-Content app\lib\versions.ts -Raw), "shopifyAdmin: '([^']+)'").Groups[1].Value
$sfVer = '2026-04'
$base = 'http://localhost:3000'
$script:pass = 0; $script:fail = 0
function Check($name, [bool]$ok, $detail = '') {
  if ($ok) { $script:pass++; "PASS  $name" } else { $script:fail++; "FAIL  $name   $detail" }
}
"Pinned Admin version: $adminVer"

$tok = (Invoke-RestMethod -Method Post -Uri "https://$($env:PUBLIC_STORE_DOMAIN)/admin/oauth/access_token" -Body @{
  grant_type='client_credentials'; client_id=$env:SHOPIFY_ADMIN_CLIENT_ID; client_secret=$env:SHOPIFY_ADMIN_CLIENT_SECRET }).access_token
function Gql($q, $vars = @{}) {
  Invoke-RestMethod -Method Post -TimeoutSec 60 -Uri "https://$($env:PUBLIC_STORE_DOMAIN)/admin/api/$adminVer/graphql.json" `
    -Headers @{'X-Shopify-Access-Token'=$tok} -ContentType 'application/json' `
    -Body (@{query=$q; variables=$vars} | ConvertTo-Json -Depth 12)
}
$variant = (Gql '{ products(first:1){ nodes{ variants(first:1){ nodes{ id price } } } } }').data.products.nodes[0].variants.nodes[0]
$vid = ($variant.id -split '/')[-1]
"Test variant $vid, price $($variant.price)"

# ---------- Part 1: session API ----------
$body = '{"storefront":"brand-a","lines":[{"variantId":"' + $vid + '","quantity":1}],"discountCodes":[]}'
Set-Content -LiteralPath "$env:TEMP\ct-sess.json" -Value $body -Encoding ascii
Set-Content -LiteralPath "$env:TEMP\ct-bad.json" -Value ($body -replace 'brand-a','nope') -Encoding ascii

$out = curl.exe -s -m 60 -D "$env:TEMP\ct.hdr" -o "$env:TEMP\ct.json" -w "%{http_code}" -X POST "$base/api/checkout/sessions" `
  -H "Origin: http://localhost:3000" -H "Content-Type: text/plain" --data-binary "@$env:TEMP\ct-sess.json"
$sess = Get-Content "$env:TEMP\ct.json" -Raw | ConvertFrom-Json
Check 'API valid request returns 200' ($out -eq '200') "got $out"
Check 'API sends X-Checkout-Api-Version' ((Get-Content "$env:TEMP\ct.hdr" -Raw) -match '(?i)x-checkout-api-version:\s*1')
Check 'API returns a Shopify checkout url' ("$($sess.next.url)" -match 'myshopify\.com/cart/c/')

$out = curl.exe -s -m 60 -o NUL -w "%{http_code}" -X POST "$base/api/checkout/sessions" -H "Origin: https://evil.example" -H "Content-Type: text/plain" --data-binary "@$env:TEMP\ct-sess.json"
Check 'API rejects an unlisted origin (403)' ($out -eq '403') "got $out"
$out = curl.exe -s -m 60 -o NUL -w "%{http_code}" -X POST "$base/api/checkout/sessions" -H "Origin: http://localhost:3000" -H "Content-Type: text/plain" --data-binary "@$env:TEMP\ct-bad.json"
Check 'API rejects an unknown storefront (400)' ($out -eq '400') "got $out"

$r = Invoke-RestMethod -Method Post -TimeoutSec 30 -Uri "https://$($env:PUBLIC_STORE_DOMAIN)/api/$sfVer/graphql.json" `
  -Headers @{'X-Shopify-Storefront-Access-Token'=$env:PUBLIC_STOREFRONT_API_TOKEN} -ContentType 'application/json' `
  -Body (@{query='query($id: ID!){ cart(id:$id){ attributes{key value} } }'; variables=@{id=$sess.id}} | ConvertTo-Json -Depth 6)
$attr = $r.data.cart.attributes | Where-Object key -eq 'storefront_id'
Check 'Cart made by our API carries storefront_id=brand-a' ($attr.value -eq 'brand-a')

# ---------- Part 2: Admin order creation on the pinned version ----------
$price = [decimal]$variant.price
$disc  = [math]::Round($price * 0.10, 2)
$taxable = $price - $disc
$tax   = [math]::Round($taxable * 0.0975, 2)
$total = $taxable + $tax
function Bag($n) { @{shopMoney=@{amount=('{0:0.00}' -f $n); currencyCode='USD'}} }
$addr = @{firstName='Contract'; lastName='Test'; address1='1 Infinite Loop'; city='Cupertino'; province='CA'; zip='95014'; countryCode='US'; phone='4085551234'}
$mut = 'mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput){ orderCreate(order:$order, options:$options){ order{ id name tags displayFinancialStatus totalPriceSet{shopMoney{amount}} totalDiscountsSet{shopMoney{amount}} totalTaxSet{shopMoney{amount}} } userErrors{field message} } }'
$order = @{
  email='contract-test@example.com'; currency='USD'; tags=@('contract_test')
  lineItems=@(@{variantId=$variant.id; quantity=1})
  shippingAddress=$addr; billingAddress=$addr
  shippingLines=@(@{title='Free shipping'; code='standard'; priceSet=(Bag 0)})
  taxesIncluded=$false
  taxLines=@(@{title='Sales tax'; rate=0.0975; priceSet=(Bag $tax)})
  discountCode=@{itemFixedDiscountCode=@{code='Discount'; amountSet=(Bag $disc)}}
  financialStatus='PAID'; note='Contract test order (auto-cancelled)'
  transactions=@(@{kind='SALE'; status='SUCCESS'; gateway='Stripe'; authorizationCode='contract_test'; amountSet=(Bag $total)})
}
$res = Gql $mut @{order=$order; options=@{inventoryBehaviour='BYPASS'; sendReceipt=$false}}
$o = $res.data.orderCreate.order
if (-not $o) { "orderCreate response:"; $res | ConvertTo-Json -Depth 8 }
Check "orderCreate accepted on $adminVer" ([bool]$o) (($res.data.orderCreate.userErrors | ConvertTo-Json -Compress))
if ($o) {
  Check "order total = $('{0:0.00}' -f $total)"   ([decimal]$o.totalPriceSet.shopMoney.amount -eq [decimal]('{0:0.00}' -f $total)) $o.totalPriceSet.shopMoney.amount
  Check "order discount = $('{0:0.00}' -f $disc)" ([decimal]$o.totalDiscountsSet.shopMoney.amount -eq [decimal]('{0:0.00}' -f $disc)) $o.totalDiscountsSet.shopMoney.amount
  Check "order tax = $('{0:0.00}' -f $tax)"       ([decimal]$o.totalTaxSet.shopMoney.amount -eq [decimal]('{0:0.00}' -f $tax)) $o.totalTaxSet.shopMoney.amount
  Check 'order is PAID' ($o.displayFinancialStatus -eq 'PAID') $o.displayFinancialStatus
  $c = Gql 'mutation($id: ID!){ orderCancel(orderId:$id, reason:OTHER, refund:false, restock:true, notifyCustomer:false){ job{ id } orderCancelUserErrors{ field message } } }' @{id=$o.id}
  $ce = $c.data.orderCancel.orderCancelUserErrors
  Check "cleanup: $($o.name) cancelled" (-not $ce -or $ce.Count -eq 0) (($c | ConvertTo-Json -Depth 6 -Compress))
}

""
"RESULT: $script:pass passed, $script:fail failed (Admin $adminVer)"
if ($script:fail -gt 0) { exit 1 }
