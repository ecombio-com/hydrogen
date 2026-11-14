# READ-ONLY. Fact-checks metafields and metaobjects between the dev store (ecombio.myshopify.com, CMS app)
# and the production store (khkkyb-b8.myshopify.com, ECOMBIOv2 app). Changes nothing in Shopify.
# Checks: metafield definitions (type, storefront access, validations), metaobject definitions (fields, access,
# entry counts), every metaobject entry field by field, and every metafield VALUE on products, collections,
# pages, articles, blogs and the shop. IDs differ between stores, so references are compared by handle.
# Run with: cd C:\Users\Admin\Shopify\Storefronts\Hydrogen; .\scripts\shopify\metafield-compare.ps1
# Output:   snapshots\metafield-compare-<timestamp>\  (dev.json, prod.json, compare.csv, code-check.csv)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$out  = Join-Path $root "snapshots\metafield-compare-$(Get-Date -Format yyyyMMdd-HHmmss)"
$ver  = '2026-10'
New-Item -ItemType Directory -Force $out | Out-Null

# What the storefront code reads (app\lib, app\routes). The Storefront API only returns these when a
# definition exists AND its storefront access is PUBLIC_READ.
$codeMetafields = @(
  'custom.pdp_steps', 'custom.specs', 'custom.faq', 'custom.product_specs', 'custom.technical_specifications',
  'custom.frequently_asked_questions', 'custom.trust_badges', 'custom.popular_searches', 'custom.handling_days_min',
  'custom.handling_days_max', 'custom.transit_extra_days', 'custom.pdp_banner', 'custom.reassurance',
  'custom.related_articles', 'custom.frequently_bought_together', 'custom.expert_reviews', 'custom.owners_manual',
  'custom.assembly_video', 'custom.card_specs', 'custom.card_badge', 'custom.deals', 'custom.parent_collection',
  'custom.sub_collections', 'custom.after_item_lists', 'custom.hub_hero', 'custom.hub_guides', 'custom.layout',
  'custom.layout_blocks', 'custom.posts', 'custom.parent_blog', 'custom.author_profile',
  'reviews.rating', 'reviews.rating_count'
)
$codeMetaobjects = @(
  'variant_url', 'announcement_bar', 'home_video', 'home_study', 'home_story', 'home_slide', 'home_showcase',
  'home_shop_category', 'home_press', 'home_faq', 'home_category'
)

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

function Gql($s, $q, $vars, [switch]$Soft) {
  $body = @{query = $q; variables = $vars} | ConvertTo-Json -Depth 10 -Compress
  for ($try = 1; $try -le 8; $try++) {
    try {
      $r = Invoke-RestMethod -Method Post -Uri "https://$($s.shop)/admin/api/$ver/graphql.json" -Headers @{'X-Shopify-Access-Token' = $s.token} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90
    } catch {
      if ($try -lt 8 -and "$($_.Exception.Message)" -match '429|502|503|504|timed out') { Start-Sleep -Seconds (2 * $try); continue }
      throw
    }
    if ($r.errors -and (($r.errors | ConvertTo-Json -Depth 5 -Compress) -match 'THROTTLED')) { Start-Sleep -Seconds 3; continue }
    if ($r.errors -and -not $Soft) { throw ($r.errors | ConvertTo-Json -Depth 5 -Compress) }
    return $r.data
  }
  throw 'Still throttled after 8 tries'
}
function Get-All($s, $field, $extra, $nodeFields, $first = 100) {
  $list = @(); $after = $null
  do {
    $q = "query(`$after: String) { $field(first: $first, after: `$after$extra) { pageInfo { hasNextPage endCursor } nodes { $nodeFields } } }"
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
# App-owned namespaces/types carry the app's ID (app--12345--x), which differs per store app.
function Norm($t) { "$t" -replace 'app--\d+', 'app--*' }
function FileName($u) { if (-not $u) { return '' }; (("$u" -split '\?')[0] -split '/')[-1] }
function Cut($t, $n = 300) { $t = "$t"; if ($t.Length -gt $n) { $t.Substring(0, $n) + '...' } else { $t } }

# --- Turn store-specific IDs (gid://shopify/Product/123) into handles so both stores compare ---
$nodesQuery = @'
query($ids: [ID!]!) { nodes(ids: $ids) { __typename id
  ... on Product { handle } ... on ProductVariant { title product { handle } } ... on Collection { handle }
  ... on Page { handle } ... on Article { handle blog { handle } } ... on Blog { handle }
  ... on Metaobject { type handle } ... on MetaobjectDefinition { type }
  ... on MediaImage { image { url } } ... on GenericFile { url } ... on Video { originalSource { url } } } }
'@
function Label($n) {
  switch ($n.__typename) {
    'Product'              { return "Product:$($n.handle)" }
    'ProductVariant'       { return "Variant:$($n.product.handle)/$($n.title)" }
    'Collection'           { return "Collection:$($n.handle)" }
    'Page'                 { return "Page:$($n.handle)" }
    'Article'              { return "Article:$($n.blog.handle)/$($n.handle)" }
    'Blog'                 { return "Blog:$($n.handle)" }
    'Metaobject'           { return "Metaobject:$(Norm $n.type)/$($n.handle)" }
    'MetaobjectDefinition' { return "MetaobjectDefinition:$(Norm $n.type)" }
    'MediaImage'           { return "Image:$(FileName $n.image.url)" }
    'GenericFile'          { return "File:$(FileName $n.url)" }
    'Video'                { return "Video:$(FileName $n.originalSource.url)" }
  }
  "$($n.__typename):?"
}
function Resolve-Gids($s, $text) {
  $ids = @([regex]::Matches($text, 'gid://shopify/[A-Za-z]+/\d+') | ForEach-Object { $_.Value } | Sort-Object -Unique)
  $map = @{}
  for ($i = 0; $i -lt $ids.Count; $i += 100) {
    $batch = @($ids[$i..([Math]::Min($i + 99, $ids.Count - 1))])
    $d = Gql $s $nodesQuery @{ids = $batch} -Soft
    foreach ($n in @($d.nodes)) { if ($n -and $n.id) { $map[$n.id] = Label $n } }
  }
  foreach ($id in $ids) { if (-not $map.ContainsKey($id)) { $map[$id] = ($id -replace '^gid://shopify/([A-Za-z]+)/\d+$', '$1:NOT-FOUND') } }
  $map
}
$script:gidMap = @{}
$evaluator = [Text.RegularExpressions.MatchEvaluator] { param($m) $script:gidMap[$m.Value] }
function Fix-Value($v) {
  $v = [regex]::Replace("$v", 'gid://shopify/[A-Za-z]+/\d+', $evaluator)
  $t = $v.Trim()
  if ($t.StartsWith('{') -or $t.StartsWith('[')) {
    try {
      $j = if ($PSVersionTable.PSVersion.Major -ge 7) { ConvertFrom-Json $t -NoEnumerate } else { ConvertFrom-Json $t }
      $v = ConvertTo-Json -InputObject $j -Depth 50 -Compress
    } catch { }
  }
  if ($v.Length -le 160) { $v } else { $v.Substring(0, 160) + '... #' + (Hash $v) }
}

# --- Snapshot one store ---
$owners = 'PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'PAGE', 'ARTICLE', 'BLOG', 'SHOP', 'CUSTOMER', 'ORDER', 'LOCATION', 'MARKET', 'COMPANY'
$valueOwners = [ordered]@{
  Product = @{field = 'products'; sel = 'handle'}
  Collection = @{field = 'collections'; sel = 'handle'}
  Page = @{field = 'pages'; sel = 'handle'}
  Article = @{field = 'articles'; sel = 'handle blog { handle }'}
  Blog = @{field = 'blogs'; sel = 'handle'}
}
$mfSel = 'metafields(first: 60) { pageInfo { hasNextPage } nodes { namespace key type value } }'

function Snapshot($name, $s) {
  $snap = [ordered]@{}
  $snap.shop = (Gql $s '{ shop { name myshopifyDomain } }' @{}).shop
  $read = {
    param($label, $block)
    try { $r = @(& $block); Write-Host ("{0,-5} {1,-22} {2}" -f $name, $label, $r.Count); , $r }
    catch { Write-Host ("{0,-5} {1,-22} COULD NOT READ: {2}" -f $name, $label, $_.Exception.Message) -ForegroundColor Yellow; $null }
  }

  $snap.metafieldDefinitions = & $read 'metafieldDefinitions' {
    foreach ($o in $owners) {
      $defs = $null
      try { $defs = Get-All $s 'metafieldDefinitions' ", ownerType: $o" 'namespace key name type { name } access { storefront } validations { name value } pinnedPosition metafieldsCount' }
      catch { continue }
      foreach ($d in $defs) {
        [ordered]@{key = "$o $(Norm $d.namespace).$($d.key)"; nsKey = "$(Norm $d.namespace).$($d.key)"; owner = $o; name = $d.name; type = $d.type.name
          storefront = "$($d.access.storefront)"; validations = (@($d.validations | ForEach-Object { "$($_.name)=$($_.value)" }) -join ' ; ')
          pinned = ($null -ne $d.pinnedPosition); countValues = $d.metafieldsCount}
      }
    }
  }

  $rawObjDefs = $null
  $snap.metaobjectDefinitions = & $read 'metaobjectDefinitions' {
    $script:rawObjDefs = Get-All $s 'metaobjectDefinitions' '' 'type name displayNameKey metaobjectsCount access { storefront } capabilities { publishable { enabled } onlineStore { enabled } translatable { enabled } } fieldDefinitions { key name required type { name } validations { name value } }'
    foreach ($d in $script:rawObjDefs) {
      [ordered]@{key = (Norm $d.type); name = $d.name; displayNameKey = $d.displayNameKey; storefront = "$($d.access.storefront)"
        publishable = [bool]$d.capabilities.publishable.enabled; onlineStore = [bool]$d.capabilities.onlineStore.enabled
        fields = (@($d.fieldDefinitions | ForEach-Object { "$($_.key):$($_.type.name)$(if ($_.required) { '*' })$(if ($_.validations) { '[' + (@($_.validations | ForEach-Object { "$($_.name)=$($_.value)" }) -join ',') + ']' })" }) -join ' ; ')
        countEntries = $d.metaobjectsCount}
    }
  }

  $snap.metaobjects = & $read 'metaobjects' {
    foreach ($d in @($script:rawObjDefs)) {
      foreach ($m in (Get-All $s 'metaobjects' ", type: `"$($d.type)`"" 'handle displayName capabilities { publishable { status } } fields { key value }' 50)) {
        $item = [ordered]@{key = "$(Norm $d.type)/$($m.handle)"; status = "$($m.capabilities.publishable.status)"}
        foreach ($f in $m.fields) { $item["value:$($f.key)"] = "$($f.value)" }
        $item
      }
    }
  }

  $ownerList = New-Object System.Collections.Generic.List[string]
  $snap.metafieldValues = & $read 'metafieldValues' {
    foreach ($kind in $valueOwners.Keys) {
      $cfg = $valueOwners[$kind]
      foreach ($n in (Get-All $s $cfg.field '' "$($cfg.sel) $mfSel" 10)) {
        $h = if ($kind -eq 'Article') { "$($n.blog.handle)/$($n.handle)" } else { $n.handle }
        $ownerList.Add("$kind $h")
        if ($n.metafields.pageInfo.hasNextPage) { Write-Host "  note: $kind $h has more than 60 metafields; only the first 60 compared" -ForegroundColor Yellow }
        foreach ($mf in $n.metafields.nodes) {
          [ordered]@{key = "$kind $h $(Norm $mf.namespace).$($mf.key)"; owner = "$kind $h"; nsKey = "$(Norm $mf.namespace).$($mf.key)"; type = $mf.type; value = "$($mf.value)"}
        }
      }
    }
    $ownerList.Add('Shop shop')
    foreach ($mf in (Gql $s "{ shop { $mfSel } }" @{}).shop.metafields.nodes) {
      [ordered]@{key = "Shop shop $(Norm $mf.namespace).$($mf.key)"; owner = 'Shop shop'; nsKey = "$(Norm $mf.namespace).$($mf.key)"; type = $mf.type; value = "$($mf.value)"}
    }
  }
  $snap.owners = @($ownerList)

  # Replace IDs with handles, normalize JSON, shorten long values (a hash keeps the full value comparable).
  $all = "$($snap | ConvertTo-Json -Depth 20 -Compress)"
  $script:gidMap = Resolve-Gids $s $all
  foreach ($sec in 'metafieldDefinitions', 'metaobjectDefinitions', 'metaobjects', 'metafieldValues') {
    foreach ($i in @($snap[$sec])) {
      if (-not $i) { continue }
      foreach ($p in @($i.Keys)) { if ($p -eq 'validations' -or $p -eq 'fields' -or $p -like 'value*') { $i[$p] = Fix-Value $i[$p] } }
    }
  }
  $snap | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $out "$name.json") -Encoding UTF8
  $snap
}

$snap = @{}
foreach ($name in $stores.Keys) { $snap[$name] = Snapshot $name $stores[$name] }

# --- Compare ---
$ignore = 'countValues', 'countEntries', 'owner', 'nsKey'
$ownerSet = @{}
foreach ($name in 'dev', 'prod') { $ownerSet[$name] = New-Object System.Collections.Generic.HashSet[string] (, [string[]]@($snap[$name].owners)) }
function Show($o, $f) {
  if (-not $o) { return '' }
  $ks = if ($f) { $f -split ', ' } else { @('name', 'type', 'storefront', 'status', 'value') }
  Cut (($ks | Where-Object { $o.Contains($_) } | ForEach-Object { "$_=$($o[$_])" }) -join ' | ')
}
$sections = 'metafieldDefinitions', 'metaobjectDefinitions', 'metaobjects', 'metafieldValues'
$rows = foreach ($sec in $sections) {
  if ($null -eq $snap.dev[$sec] -or $null -eq $snap.prod[$sec]) { [pscustomobject]@{Section = $sec; Key = '(whole section)'; Status = 'could not read'; Fields = ''; Dev = ''; Prod = ''}; continue }
  $d = @{}; $p = @{}
  foreach ($i in $snap.dev[$sec])  { $d[$i.key] = $i }
  foreach ($i in $snap.prod[$sec]) { $p[$i.key] = $i }
  foreach ($k in (@($d.Keys) + @($p.Keys) | Sort-Object -Unique)) {
    $a = $d[$k]; $b = $p[$k]; $f = ''
    if (-not $b)     { $st = if ($sec -eq 'metafieldValues' -and -not $ownerSet.prod.Contains($a.owner)) { 'owner not in prod' } else { 'dev only' } }
    elseif (-not $a) { $st = if ($sec -eq 'metafieldValues' -and -not $ownerSet.dev.Contains($b.owner)) { 'owner not in dev' } else { 'prod only' } }
    else {
      $names = @(@($a.Keys) + @($b.Keys) | Sort-Object -Unique | Where-Object { $_ -ne 'key' -and $ignore -notcontains $_ })
      $f  = @($names | Where-Object { [string]$a[$_] -ne [string]$b[$_] }) -join ', '
      $st = if ($f) { 'different' } else { 'same' }
    }
    [pscustomobject]@{Section = $sec; Key = $k; Status = $st; Fields = $f; Dev = (Show $a $f); Prod = (Show $b $f)}
  }
}
$rows | Export-Csv (Join-Path $out 'compare.csv') -NoTypeInformation -Encoding UTF8

# --- Code check: can the storefront read what the code asks for, in each store? ---
function DefInfo($name, $nsKey) {
  $defs = @($snap[$name].metafieldDefinitions | Where-Object { $_ -and $_.nsKey -eq $nsKey })
  if (-not $defs.Count) { return @{owners = '-'; storefront = '-'; values = 0} }
  @{owners = (@($defs | ForEach-Object { $_.owner }) -join ','); storefront = (@($defs | ForEach-Object { $_.storefront } | Sort-Object -Unique) -join ','); values = [int](($defs | ForEach-Object { [int]$_['countValues'] } | Measure-Object -Sum).Sum)}
}
$check = @(
  foreach ($k in $codeMetafields) {
    $dv = DefInfo 'dev' $k; $pv = DefInfo 'prod' $k
    $verdict = if ($pv.owners -eq '-') { if ($dv.owners -eq '-') { 'no definition in either store' } else { 'MISSING in prod' } }
               elseif ($pv.storefront -notmatch 'PUBLIC_READ') { 'prod storefront CANNOT read' }
               elseif ($pv.values -eq 0 -and $dv.values -gt 0) { 'defined in prod, but no values yet' }
               else { 'ok' }
    [pscustomobject]@{Kind = 'metafield'; Key = $k; Verdict = $verdict; DevOwners = $dv.owners; ProdOwners = $pv.owners; DevStorefront = $dv.storefront; ProdStorefront = $pv.storefront; DevCount = $dv.values; ProdCount = $pv.values}
  }
  foreach ($t in $codeMetaobjects) {
    $dd = @($snap.dev.metaobjectDefinitions | Where-Object { $_ -and $_.key -eq $t })[0]
    $pd = @($snap.prod.metaobjectDefinitions | Where-Object { $_ -and $_.key -eq $t })[0]
    $verdict = if (-not $pd) { if (-not $dd) { 'no definition in either store' } else { 'MISSING in prod' } }
               elseif ($pd.storefront -ne 'PUBLIC_READ') { 'prod storefront CANNOT read' }
               elseif ($pd.countEntries -eq 0 -and $dd -and $dd.countEntries -gt 0) { 'defined in prod, but no entries yet' }
               elseif ($dd -and $dd.fields -ne $pd.fields) { 'fields differ dev vs prod' }
               else { 'ok' }
    [pscustomobject]@{Kind = 'metaobject'; Key = $t; Verdict = $verdict; DevOwners = ''; ProdOwners = ''; DevStorefront = "$($dd.storefront)"; ProdStorefront = "$($pd.storefront)"; DevCount = [int]$dd.countEntries; ProdCount = [int]$pd.countEntries}
  }
)
$check | Export-Csv (Join-Path $out 'code-check.csv') -NoTypeInformation -Encoding UTF8

''
'=== 1. CODE CHECK (what the storefront reads) ==='
$check | Format-Table Kind, Key, Verdict, ProdStorefront, DevCount, ProdCount -AutoSize | Out-String -Width 220
'=== 2. SUMMARY (rows per section and status) ==='
$rows | Group-Object Section, Status | Sort-Object Name | Format-Table Count, Name -AutoSize | Out-String -Width 200
'=== 3. DEFINITION DIFFERENCES (not "same") ==='
$rows | Where-Object { $_.Section -like '*Definitions' -and $_.Status -ne 'same' } | Format-Table Section, Key, Status, Fields -AutoSize | Out-String -Width 220
'=== 4. VALUE DIFFERENCES by metafield (owners in both stores) ==='
$rows | Where-Object { $_.Section -eq 'metafieldValues' -and ($_.Status -eq 'different' -or $_.Status -eq 'dev only' -or $_.Status -eq 'prod only') } |
  ForEach-Object { [pscustomobject]@{Status = $_.Status; Metafield = ($_.Key -split ' ')[-1]} } |
  Group-Object Status, Metafield | Sort-Object Count -Descending | Format-Table Count, Name -AutoSize | Out-String -Width 200
'=== 5. METAOBJECT ENTRY DIFFERENCES by type ==='
$rows | Where-Object { $_.Section -eq 'metaobjects' -and $_.Status -ne 'same' } |
  ForEach-Object { [pscustomobject]@{Status = $_.Status; Type = ($_.Key -split '/')[0]} } |
  Group-Object Status, Type | Sort-Object Name | Format-Table Count, Name -AutoSize | Out-String -Width 200
"Full table: $(Join-Path $out 'compare.csv')"
