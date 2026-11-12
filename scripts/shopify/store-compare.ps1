# READ-ONLY. Snapshots the dev store (ecombio.myshopify.com, CMS app) and the production store
# (khkkyb-b8.myshopify.com, ECOMBIOv2 app), then writes one comparison table. Changes nothing in Shopify.
# Run with: cd C:\Users\Admin\Shopify\Storefronts\Hydrogen; .\scripts\shopify\store-compare.ps1
# Output:   snapshots\store-compare-<timestamp>\  (dev.json, prod.json, compare.csv)
$ErrorActionPreference = 'Stop'
$root  = Split-Path (Split-Path $PSScriptRoot)
$out   = Join-Path $root "snapshots\store-compare-$(Get-Date -Format yyyyMMdd-HHmmss)"
$ver   = '2026-10'
New-Item -ItemType Directory -Force $out | Out-Null

function Get-Token($shop, $cid, $csec) {
  if (-not $cid -or -not $csec) { throw "Missing client ID/secret for $shop" }
  (Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{grant_type = 'client_credentials'; client_id = $cid; client_secret = $csec} -TimeoutSec 30).access_token
}

# --- Log in to both stores (secrets are never printed) ---
$cms = @{}
Get-Content (Join-Path $PSScriptRoot '.cms.env') | Where-Object { $_ -match '^\s*[^#=\s]+=' } | ForEach-Object { $k, $v = $_ -split '=', 2; $cms[$k.Trim()] = $v.Trim() }
$stores = [ordered]@{
  dev  = @{shop = 'ecombio.myshopify.com';   token = (Get-Token 'ecombio.myshopify.com' $cms.CMS_CLIENT_ID $cms.CMS_CLIENT_SECRET)}
  prod = @{shop = 'khkkyb-b8.myshopify.com'; token = (Get-Token 'khkkyb-b8.myshopify.com' ([Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_ID', 'User')) ([Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_SECRET', 'User')))}
}
Remove-Variable cms
Write-Host 'Logged in to dev and prod.'

function Gql($s, $q, $vars) {
  $body = @{query = $q; variables = $vars} | ConvertTo-Json -Depth 10 -Compress
  for ($try = 1; $try -le 6; $try++) {
    $r = Invoke-RestMethod -Method Post -Uri "https://$($s.shop)/admin/api/$ver/graphql.json" -Headers @{'X-Shopify-Access-Token' = $s.token} -ContentType 'application/json' -Body $body -TimeoutSec 60
    if ($r.errors -and (($r.errors | ConvertTo-Json -Depth 5 -Compress) -match 'THROTTLED')) { Start-Sleep -Seconds 3; continue }
    if ($r.errors) { throw ($r.errors | ConvertTo-Json -Depth 5 -Compress) }
    return $r.data
  }
  throw 'Still throttled after 6 tries'
}
function Get-All($s, $field, $extra, $nodeFields) {
  $list = @(); $after = $null
  do {
    $q = "query(`$after: String) { $field(first: 100, after: `$after$extra) { pageInfo { hasNextPage endCursor } nodes { $nodeFields } } }"
    $d = (Gql $s $q @{after = $after}).$field
    $list += @($d.nodes); $after = $d.pageInfo.endCursor
  } while ($d.pageInfo.hasNextPage)
  , $list
}
function Hash($t) {
  if (-not $t) { return '' }
  $b = [Text.Encoding]::UTF8.GetBytes($t)
  ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($b)) -replace '-', '').Substring(0, 12)
}
# Store domains differ, so strip them from URLs before comparing.
function Url($u) { if (-not $u) { return '' }; $u -replace '^https?://([a-z0-9-]+\.myshopify\.com|(www\.)?(ecombio|bicyclebio|scooterbio|skaterbio)\.com)', '' }

# --- What we compare. Each section returns items with a 'key' (no IDs, no timestamps). ---
$sections = [ordered]@{
  products = { param($s) Get-All $s 'products' '' 'handle title status vendor productType tags variantsCount { count }' | ForEach-Object {
      [ordered]@{key = $_.handle; title = $_.title; status = $_.status; vendor = $_.vendor; productType = $_.productType; tags = (@($_.tags | Sort-Object) -join '|'); variants = $_.variantsCount.count} } }
  collections = { param($s) Get-All $s 'collections' '' 'handle title productsCount { count } ruleSet { appliedDisjunctively rules { column relation condition } }' | ForEach-Object {
      [ordered]@{key = $_.handle; title = $_.title; kind = $(if ($_.ruleSet) { 'smart' } else { 'manual' }); rules = (@($_.ruleSet.rules | ForEach-Object { "$($_.column) $($_.relation) $($_.condition)" }) -join ' ; '); products = $_.productsCount.count} } }
  menus = { param($s) Get-All $s 'menus' '' 'handle title items { title url items { title url items { title url } } }' | ForEach-Object {
      $lines = foreach ($a in $_.items) { "$($a.title)=$(Url $a.url)"; foreach ($b in $a.items) { "$($a.title) > $($b.title)=$(Url $b.url)"; foreach ($c in $b.items) { "$($a.title) > $($b.title) > $($c.title)=$(Url $c.url)" } } }
      [ordered]@{key = $_.handle; title = $_.title; itemCount = @($lines).Count; items = (@($lines) -join ' ; ')} } }
  pages = { param($s) Get-All $s 'pages' '' 'handle title isPublished body' | ForEach-Object {
      [ordered]@{key = $_.handle; title = $_.title; published = $_.isPublished; bodyLength = "$($_.body)".Length; bodyHash = (Hash $_.body)} } }
  articles = { param($s) Get-All $s 'articles' '' 'handle title isPublished body blog { handle }' | ForEach-Object {
      [ordered]@{key = "$($_.blog.handle)/$($_.handle)"; title = $_.title; published = $_.isPublished; bodyLength = "$($_.body)".Length; bodyHash = (Hash $_.body)} } }
  redirects = { param($s) Get-All $s 'urlRedirects' '' 'path target' | ForEach-Object {
      [ordered]@{key = $_.path; title = $_.path; target = (Url $_.target)} } }
  metafieldDefinitions = { param($s) foreach ($o in 'PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'PAGE', 'ARTICLE', 'BLOG', 'SHOP') {
      Get-All $s 'metafieldDefinitions' ", ownerType: $o" 'namespace key name type { name }' | ForEach-Object {
        [ordered]@{key = "$o $($_.namespace).$($_.key)"; title = $_.name; type = $_.type.name} } } }
  metaobjectDefinitions = { param($s) Get-All $s 'metaobjectDefinitions' '' 'type name metaobjectsCount fieldDefinitions { key type { name } }' | ForEach-Object {
      [ordered]@{key = $_.type; title = $_.name; entries = $_.metaobjectsCount; fields = (@($_.fieldDefinitions | ForEach-Object { "$($_.key):$($_.type.name)" }) -join ' ; ')} } }
  salesChannels = { param($s) Get-All $s 'publications' '' 'name' | ForEach-Object { [ordered]@{key = $_.name; title = $_.name} } }
}

# --- Snapshot both stores ---
$snap = @{}
foreach ($name in $stores.Keys) {
  $s = $stores[$name]; $snap[$name] = [ordered]@{}
  $snap[$name].shop = (Gql $s '{ shop { name myshopifyDomain currencyCode plan { displayName } primaryDomain { host } } }' @{}).shop
  foreach ($sec in $sections.Keys) {
    try { $snap[$name][$sec] = @(& $sections[$sec] $s); Write-Host ("{0,-5} {1,-22} {2}" -f $name, $sec, $snap[$name][$sec].Count) }
    catch { $snap[$name][$sec] = $null; Write-Host ("{0,-5} {1,-22} COULD NOT READ: {2}" -f $name, $sec, $_.Exception.Message) -ForegroundColor Yellow }
  }
  $snap[$name] | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $out "$name.json") -Encoding UTF8
}

# --- Compare ---
function Cut($t) { $t = "$t"; if ($t.Length -gt 300) { $t.Substring(0, 300) + '...' } else { $t } }
function Show($o, $f) {
  if (-not $o) { return '' }
  $ks = if ($f) { $f -split ', ' } else { @('title') }
  Cut (($ks | Where-Object { $o.Contains($_) } | ForEach-Object { "$_=$($o[$_])" }) -join ' | ')
}
$rows = foreach ($sec in $sections.Keys) {
  if ($null -eq $snap.dev[$sec] -or $null -eq $snap.prod[$sec]) { [pscustomobject]@{Section = $sec; Key = '(whole section)'; Status = 'could not read'; Fields = ''; Dev = ''; Prod = ''}; continue }
  $d = @{}; $p = @{}
  foreach ($i in $snap.dev[$sec])  { $d[$i.key] = $i }
  foreach ($i in $snap.prod[$sec]) { $p[$i.key] = $i }
  foreach ($k in (@($d.Keys) + @($p.Keys) | Sort-Object -Unique)) {
    $a = $d[$k]; $b = $p[$k]
    if (-not $b)     { $st = 'dev only';  $f = '' }
    elseif (-not $a) { $st = 'prod only'; $f = '' }
    else {
      $f  = @($a.Keys | Where-Object { $_ -ne 'key' -and ([string]$a[$_]) -ne ([string]$b[$_]) }) -join ', '
      $st = if ($f) { 'different' } else { 'same' }
    }
    [pscustomobject]@{Section = $sec; Key = $k; Status = $st; Fields = $f; Dev = (Show $a $f); Prod = (Show $b $f)}
  }
}
$csv = Join-Path $out 'compare.csv'
$rows | Export-Csv $csv -NoTypeInformation -Encoding UTF8

''
'=== SUMMARY (rows per section and status) ==='
$rows | Group-Object Section, Status | Sort-Object Name | Format-Table Count, Name -AutoSize | Out-String -Width 200
"Table: $csv"
