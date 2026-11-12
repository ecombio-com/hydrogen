# READ-ONLY full backup of the production store (khkkyb-b8.myshopify.com) to your local disk.
# Uses the ECOMBIOv2 app (Windows user env vars). Changes nothing in Shopify.
# Run with: cd C:\Users\Admin\Shopify\Storefronts\Hydrogen; .\scripts\shopify\prod-backup.ps1
# Output:   C:\Users\Admin\Shopify\Backups\prod-<timestamp>\   (outside the repo: holds customer/order data)
#   bulk\*.jsonl    big data sets (one JSON object per line; child rows carry __parentId)
#   *.json          smaller settings/content
#   images\         product images and uploaded files
#   summary.txt     what was saved, and anything that failed
param([switch]$SkipImages)
$ErrorActionPreference = 'Stop'
$shop = 'khkkyb-b8.myshopify.com'
$ver  = '2026-10'
$out  = "C:\Users\Admin\Shopify\Backups\prod-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Force "$out\bulk" | Out-Null
$summary = [System.Collections.Generic.List[string]]::new()
function Note($t, $color = 'Gray') { Write-Host $t -ForegroundColor $color; $summary.Add($t) }

# --- Login ---
$cid  = [Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_ID', 'User')
$csec = [Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_SECRET', 'User')
if (-not $cid -or -not $csec) { Write-Host 'Missing SHOPIFY_ECOMBIOV2_CLIENT_ID / SHOPIFY_ECOMBIOV2_CLIENT_SECRET user env vars.'; return }
$token = (Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{grant_type = 'client_credentials'; client_id = $cid; client_secret = $csec} -TimeoutSec 30).access_token
Remove-Variable csec
if (-not $token) { Write-Host 'Login failed.'; return }
Note "Backup of $shop -> $out" 'Cyan'

function Gql($q, $vars = @{}) {
  $body = @{query = $q; variables = $vars} | ConvertTo-Json -Depth 20 -Compress
  for ($try = 1; $try -le 8; $try++) {
    $r = Invoke-RestMethod -Method Post -Uri "https://$shop/admin/api/$ver/graphql.json" -Headers @{'X-Shopify-Access-Token' = $token} -ContentType 'application/json' -Body $body -TimeoutSec 120
    if ($r.errors -and (($r.errors | ConvertTo-Json -Depth 5 -Compress) -match 'THROTTLED')) { Start-Sleep -Seconds 3; continue }
    if ($r.errors) { throw ($r.errors | ConvertTo-Json -Depth 5 -Compress) }
    return $r.data
  }
  throw 'Still throttled after 8 tries'
}
function Get-All($field, $extra, $nodeFields) {
  $list = @(); $after = $null
  do {
    $d = (Gql "query(`$after: String) { $field(first: 100, after: `$after$extra) { pageInfo { hasNextPage endCursor } nodes { $nodeFields } } }" @{after = $after}).$field
    $list += @($d.nodes); $after = $d.pageInfo.endCursor
  } while ($d.pageInfo.hasNextPage)
  $list
}
function Save($name, $data) { $data | ConvertTo-Json -Depth 30 | Set-Content "$out\$name.json" -Encoding UTF8 }

# --- Bulk export: Shopify builds one big file in the background, we download it ---
function Bulk($name, $q) {
  try {
    $m = 'mutation($q: String!) { bulkOperationRunQuery(query: $q) { bulkOperation { id } userErrors { field message } } }'
    $r = (Gql $m @{q = $q}).bulkOperationRunQuery
    if ($r.userErrors.Count) { throw ($r.userErrors | ConvertTo-Json -Compress) }
    $id = $r.bulkOperation.id
    do {
      Start-Sleep -Seconds 3
      $op = (Gql 'query($id: ID!) { node(id: $id) { ... on BulkOperation { status errorCode objectCount url partialDataUrl } } }' @{id = $id}).node
      Write-Host "  $name ... $($op.status) ($($op.objectCount) rows)"
    } while ($op.status -in 'CREATED', 'RUNNING')
    $file = "$out\bulk\$name.jsonl"
    if ($op.status -ne 'COMPLETED') {
      if ($op.partialDataUrl) { Invoke-WebRequest $op.partialDataUrl -OutFile $file }
      Note ("{0,-16} FAILED: {1} {2} (partial data saved if any)" -f $name, $op.status, $op.errorCode) 'Yellow'; return
    }
    if ($op.url) { Invoke-WebRequest $op.url -OutFile $file } else { New-Item -ItemType File -Force $file | Out-Null }
    Note ("{0,-16} {1} rows" -f $name, $op.objectCount) 'Green'
  } catch { Note ("{0,-16} FAILED: {1}" -f $name, $_.Exception.Message) 'Yellow' }
}
$scopes = @((Gql '{ currentAppInstallation { accessScopes { handle } } }').currentAppInstallation.accessScopes.handle)
if ($scopes -notcontains 'read_all_orders') { Note 'NOTE: app lacks read_all_orders, so orders are limited to the last 60 days.' 'Yellow' } else { Note 'Orders: full history (read_all_orders present).' 'Green' }
$mf = 'metafields { edges { node { namespace key type value } } }'
$addr = 'address1 address2 city province provinceCode country countryCodeV2 zip phone company firstName lastName'
$money = 'shopMoney { amount currencyCode }'

Bulk 'products' "{ products { edges { node { id handle title descriptionHtml vendor productType tags status createdAt updatedAt publishedAt templateSuffix seo { title description } category { fullName } options { name values } $mf
  media { edges { node { ... on MediaImage { id alt image { url altText width height } } ... on Video { id alt sources { url } } ... on ExternalVideo { id originUrl } } } }
  variants { edges { node { id title sku barcode price compareAtPrice taxable inventoryPolicy inventoryQuantity position selectedOptions { name value } image { url } inventoryItem { id tracked requiresShipping measurement { weight { unit value } } } $mf } } } } } } }"
Bulk 'collections' "{ collections { edges { node { id handle title descriptionHtml sortOrder templateSuffix updatedAt seo { title description } image { url altText } ruleSet { appliedDisjunctively rules { column relation condition } } $mf products { edges { node { id handle } } } } } } }"
Bulk 'inventory' '{ inventoryItems { edges { node { id sku tracked unitCost { amount currencyCode } variant { id } inventoryLevels { edges { node { location { id name } quantities(names: ["available", "on_hand", "committed", "incoming"]) { name quantity } } } } } } } }'
Bulk 'customers' "{ customers { edges { node { id firstName lastName displayName defaultEmailAddress { emailAddress marketingState } defaultPhoneNumber { phoneNumber } state tags note verifiedEmail taxExempt createdAt updatedAt numberOfOrders amountSpent { amount currencyCode } defaultAddress { $addr } $mf } } } }"
Bulk 'orders' "{ orders { edges { node { id name createdAt processedAt cancelledAt closedAt email phone displayFinancialStatus displayFulfillmentStatus tags note sourceName currencyCode
  customer { id } customAttributes { key value } shippingAddress { $addr } billingAddress { $addr }
  subtotalPriceSet { $money } totalShippingPriceSet { $money } totalTaxSet { $money } totalDiscountsSet { $money } totalPriceSet { $money } totalRefundedSet { $money }
  discountCodes shippingLine { title code originalPriceSet { $money } } $mf
  transactions { id kind status gateway createdAt amountSet { $money } }
  refunds { id createdAt note totalRefundedSet { $money } }
  fulfillments { id status createdAt trackingInfo { company number url } }
  lineItems { edges { node { id name sku quantity variant { id } product { id } originalUnitPriceSet { $money } discountedTotalSet { $money } } } } } } } }"
Bulk 'draftOrders' "{ draftOrders { edges { node { id name status createdAt email tags customer { id } totalPriceSet { $money } lineItems { edges { node { id name sku quantity variant { id } originalUnitPriceSet { $money } } } } } } } }"
Bulk 'discounts' '{ discountNodes { edges { node { id discount { __typename
  ... on DiscountCodeBasic { title status summary startsAt endsAt usageLimit appliesOncePerCustomer codes { edges { node { code } } } }
  ... on DiscountCodeBxgy { title status summary startsAt endsAt usageLimit codes { edges { node { code } } } }
  ... on DiscountCodeFreeShipping { title status summary startsAt endsAt usageLimit codes { edges { node { code } } } }
  ... on DiscountCodeApp { title status startsAt endsAt }
  ... on DiscountAutomaticBasic { title status summary startsAt endsAt }
  ... on DiscountAutomaticBxgy { title status summary startsAt endsAt }
  ... on DiscountAutomaticFreeShipping { title status summary startsAt endsAt }
  ... on DiscountAutomaticApp { title status startsAt endsAt } } } } } }'
Bulk 'giftCards' '{ giftCards { edges { node { id lastCharacters enabled expiresOn createdAt note initialValue { amount currencyCode } balance { amount currencyCode } customer { id } } } } }'
Bulk 'pages' "{ pages { edges { node { id handle title body bodySummary isPublished publishedAt templateSuffix createdAt updatedAt $mf } } } }"
Bulk 'articles' "{ articles { edges { node { id handle title body summary tags isPublished publishedAt templateSuffix author { name } blog { id handle title } image { url altText } $mf } } } }"
Bulk 'customerAddresses' "{ customers { edges { node { id addressesV2 { edges { node { id $addr } } } } } } }"
Bulk 'abandonedCheckouts' "{ abandonedCheckouts { edges { node { id name createdAt updatedAt abandonedCheckoutUrl customer { id } totalPriceSet { $money } lineItems { edges { node { title sku quantity variant { id } } } } } } } }"
Bulk 'sellingPlans' '{ sellingPlanGroups { edges { node { id name merchantCode summary options sellingPlans { edges { node { id name description options } } } } } } }'
Bulk 'productChannels' '{ products { edges { node { id handle resourcePublicationsV2(onlyPublished: false) { edges { node { isPublished publishDate publication { id name } } } } } } } }'
Bulk 'collectionChannels' '{ collections { edges { node { id handle resourcePublicationsV2(onlyPublished: false) { edges { node { isPublished publishDate publication { id name } } } } } } } }'
Bulk 'returns' '{ orders { edges { node { id name returns { edges { node { id name status } } } } } } }'
Bulk 'files' '{ files { edges { node { id alt createdAt fileStatus __typename ... on MediaImage { image { url width height } } ... on GenericFile { url mimeType } ... on Video { filename sources { url } } } } } }'

# --- Smaller data sets (normal queries) ---
function Small($name, [scriptblock]$get) {
  try { $d = & $get; Save $name $d; Note ("{0,-16} {1} items" -f $name, @($d).Count) 'Green' }
  catch { Note ("{0,-16} FAILED: {1}" -f $name, $_.Exception.Message) 'Yellow' }
}
Small 'shop'        { (Gql "{ shop { name email contactEmail myshopifyDomain currencyCode ianaTimezone weightUnit plan { displayName } primaryDomain { host url } billingAddress { $addr } shopPolicies { type title body url } } }").shop }
Small 'menus'       { Get-All 'menus' '' 'id handle title items { title type url resourceId tags items { title type url resourceId tags items { title type url resourceId tags } } }' }
Small 'redirects'   { Get-All 'urlRedirects' '' 'id path target' }
Small 'blogs'       { Get-All 'blogs' '' 'id handle title templateSuffix commentPolicy' }
Small 'locations'   { Get-All 'locations' '' 'id name isActive fulfillsOnlineOrders address { address1 address2 city province provinceCode country countryCode zip phone }' }
Small 'markets'     { Get-All 'markets' '' 'id name handle' }
Small 'salesChannels' { Get-All 'publications' '' 'id name' }
Small 'shipping'    { Get-All 'deliveryProfiles' '' 'id name default profileLocationGroups { locationGroup { id } locationGroupZones(first: 100) { edges { node { zone { id name countries { name code { countryCode restOfWorld } provinces { name code } } } methodDefinitions(first: 100) { edges { node { id name active description rateProvider { ... on DeliveryRateDefinition { price { amount currencyCode } } } } } } } } } }' }
Small 'payouts'     { (Gql '{ shopifyPaymentsAccount { payouts(first: 250, reverse: true) { nodes { id issuedAt status net { amount currencyCode } } } } }').shopifyPaymentsAccount.payouts.nodes }
Small 'metafieldDefinitions' { foreach ($o in 'PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'PAGE', 'ARTICLE', 'BLOG', 'SHOP', 'LOCATION', 'MARKET') {
    Get-All 'metafieldDefinitions' ", ownerType: $o" 'id namespace key name description ownerType type { name } validations { name value }' } }
Small 'metaobjectDefinitions' { Get-All 'metaobjectDefinitions' '' 'id type name description displayNameKey metaobjectsCount fieldDefinitions { key name description required type { name } validations { name value } }' }
try {
  $types = @((Get-Content "$out\metaobjectDefinitions.json" -Raw | ConvertFrom-Json) | ForEach-Object { $_.type })
  Small 'metaobjects' { foreach ($t in $types) { Get-All 'metaobjects' ", type: `"$t`"" 'id handle type displayName updatedAt fields { key type value }' } }
} catch { Note "metaobjects      FAILED: $($_.Exception.Message)" 'Yellow' }

Small 'languages'     { (Gql '{ shopLocales { locale name primary published } }').shopLocales }
Small 'segments'      { Get-All 'segments' '' 'id name query creationDate' }
Small 'webhooks'      { Get-All 'webhookSubscriptions' '' 'id topic format createdAt' }
Small 'catalogs'      { Get-All 'catalogs' '' 'id title status priceList { id name currency } publication { id }' }
Small 'priceLists'    { Get-All 'priceLists' '' 'id name currency parent { adjustment { type value } }' }
Small 'scriptTags'    { Get-All 'scriptTags' '' 'id src displayScope' }

# --- Translations (only if the store has extra languages) ---
try {
  $extra = @((Get-Content "$out\languages.json" -Raw | ConvertFrom-Json) | Where-Object { -not $_.primary } | ForEach-Object { $_.locale })
  if ($extra.Count) {
    Small 'translations' { foreach ($loc in $extra) { foreach ($rt in 'PRODUCT', 'PRODUCT_OPTION', 'COLLECTION', 'ONLINE_STORE_PAGE', 'ONLINE_STORE_ARTICLE', 'ONLINE_STORE_BLOG', 'METAOBJECT', 'METAFIELD', 'MENU', 'LINK', 'SHOP_POLICY', 'SHOP') {
        Get-All 'translatableResources' ", resourceType: $rt" "resourceId translatableContent { key value locale } translations(locale: `"$loc`") { key value locale }" } } }
  } else { Note 'translations     none (store has one language)' }
} catch { Note "translations     FAILED: $($_.Exception.Message)" 'Yellow' }

# --- Online Store themes: every file of every theme (the live store still has a theme) ---
try {
  $themes = Get-All 'themes' '' 'id name role'
  Save 'themes' $themes
  foreach ($th in $themes) {
    $dir = "$out\themes\$($th.name -replace '[\\/:*?"<>|]', '_') ($($th.role))"
    $after = $null; $n = 0
    do {
      $d = (Gql 'query($id: ID!, $after: String) { theme(id: $id) { files(first: 50, after: $after) { pageInfo { hasNextPage endCursor } nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } ... on OnlineStoreThemeFileBodyBase64 { contentBase64 } ... on OnlineStoreThemeFileBodyUrl { url } } } } } }' @{id = $th.id; after = $after}).theme.files
      foreach ($f in $d.nodes) {
        $p = Join-Path $dir $f.filename; New-Item -ItemType Directory -Force (Split-Path $p) | Out-Null
        if ($null -ne $f.body.content) { [IO.File]::WriteAllText($p, $f.body.content) }
        elseif ($f.body.contentBase64) { [IO.File]::WriteAllBytes($p, [Convert]::FromBase64String($f.body.contentBase64)) }
        elseif ($f.body.url) { Invoke-WebRequest $f.body.url -OutFile $p }
        $n++
      }
      $after = $d.pageInfo.endCursor
    } while ($d.pageInfo.hasNextPage)
    Note ("{0,-16} {1}: {2} files" -f 'theme', $th.name, $n) 'Green'
  }
} catch { Note "themes           FAILED: $($_.Exception.Message)" 'Yellow' }

# --- Images: download every product image and uploaded file ---
if (-not $SkipImages) {
  $urls = @()
  foreach ($f in 'products', 'files', 'collections', 'articles') {
    $p = "$out\bulk\$f.jsonl"
    if (Test-Path $p) { $urls += [regex]::Matches((Get-Content $p -Raw), 'https:(?:\\?/){2}cdn\.shopify\.com[^"\s]+') | ForEach-Object { $_.Value -replace '\\/', '/' } }
  }
  $urls = @($urls | Sort-Object -Unique)
  New-Item -ItemType Directory -Force "$out\images" | Out-Null
  Write-Host "Downloading $($urls.Count) images/files..."
  $failed = $urls | ForEach-Object -ThrottleLimit 8 -Parallel {
    $u = $_; $name = ([uri]$u).AbsolutePath.TrimStart('/') -replace '[\\/:*?"<>|]', '_'
    $dest = Join-Path $using:out "images\$name"
    if (-not (Test-Path $dest)) { try { Invoke-WebRequest $u -OutFile $dest -TimeoutSec 120 } catch { $u } }
  }
  Note ("{0,-16} {1} downloaded, {2} failed" -f 'images', ($urls.Count - @($failed).Count), @($failed).Count) $(if (@($failed).Count) { 'Yellow' } else { 'Green' })
  if (@($failed).Count) { $failed | Set-Content "$out\images-failed.txt" }
}

$summary | Set-Content "$out\summary.txt" -Encoding UTF8
''
"Done. Size: {0:N1} MB  ->  $out" -f ((Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
