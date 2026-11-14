# pdp-copy.ps1
# Step 3b of the pdp.* rename: copies values from the old custom.* fields into the new pdp.* fields.
# Never changes or deletes the old fields, so the live site keeps working until the code switch.
# Preview by default. Add -Apply to write. Safe to re-run: values that already match are skipped.
#
#   pwsh -NoProfile -File scripts\shopify\pdp-copy.ps1            # prod, preview
#   pwsh -NoProfile -File scripts\shopify\pdp-copy.ps1 -Apply     # prod, write
#
# What it does
#   custom.specs / faq / pdp_steps          -> pdp.specs / faq / steps            (copied as-is)
#   custom.related_articles                 -> pdp.articles
#   custom.frequently_bought_together       -> pdp.bought_together
#   custom.pdp_banner                       -> pdp.banner
#   custom.owners_manual + assembly_video   -> one shared pdp_resource entry per manual/video pair -> pdp.resources
#   handling days + transit + trust badges
#     + reassurance                         -> one shared pdp_policy entry per identical set      -> pdp.policy
#   expert_reviews entries                  -> pdp_video entries (same handles)                   -> pdp.videos
#   variant_url entries                     -> pdp_variant_url entries (same handles, same fields)
param(
  [ValidateSet('prod', 'dev')][string]$Store = 'prod',
  [switch]$Apply,
  [switch]$IncludeVideos   # off by default: the 7 expert_reviews entries in prod are placeholder samples no product uses
)
$ErrorActionPreference = 'Stop'
$ver = '2026-10'

function Get-Token($shop, $cid, $csec) {
  if (-not $cid -or -not $csec) { throw "Missing client ID/secret for $shop" }
  (Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{grant_type = 'client_credentials'; client_id = $cid; client_secret = $csec} -TimeoutSec 30).access_token
}
if ($Store -eq 'prod') {
  $shop = 'khkkyb-b8.myshopify.com'
  $token = Get-Token $shop ([Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_ID', 'User')) ([Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_SECRET', 'User'))
} else {
  $cms = @{}
  Get-Content (Join-Path $PSScriptRoot '.cms.env') | Where-Object { $_ -match '^\s*[^#=\s]+=' } | ForEach-Object { $k, $v = $_ -split '=', 2; $cms[$k.Trim()] = $v.Trim() }
  $shop = 'ecombio.myshopify.com'
  $token = Get-Token $shop $cms.CMS_CLIENT_ID $cms.CMS_CLIENT_SECRET
  Remove-Variable cms
}

function Gql($q, $vars = @{}) {
  $body = @{query = $q; variables = $vars} | ConvertTo-Json -Depth 20 -Compress
  for ($try = 1; $try -le 8; $try++) {
    try {
      $r = Invoke-RestMethod -Method Post -Uri "https://$shop/admin/api/$ver/graphql.json" -Headers @{'X-Shopify-Access-Token' = $token} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90
    } catch {
      if ($try -lt 8 -and "$($_.Exception.Message)" -match '429|502|503|504|timed out') { Start-Sleep -Seconds (2 * $try); continue }
      throw
    }
    if ($r.errors -and (($r.errors | ConvertTo-Json -Depth 5 -Compress) -match 'THROTTLED')) { Start-Sleep -Seconds 3; continue }
    if ($r.errors) { throw ($r.errors | ConvertTo-Json -Depth 5 -Compress) }
    return $r.data
  }
  throw 'Still throttled after 8 tries'
}
function Assert-Ok($p, $what) {
  if ($p.userErrors -and @($p.userErrors).Count -gt 0) { throw "$what failed: $($p.userErrors | ConvertTo-Json -Depth 5 -Compress)" }
}
function Hash8($s) { ([BitConverter]::ToString([Security.Cryptography.MD5]::HashData([Text.Encoding]::UTF8.GetBytes("$s"))) -replace '-', '').Substring(0, 8).ToLower() }
function Slug($s) { (("$s".ToLower() -replace '[^a-z0-9]+', '-').Trim('-')) }

$s = (Gql '{ shop { name myshopifyDomain } }').shop
Write-Host ("Store: {0} ({1})  Mode: {2}" -f $s.name, $s.myshopifyDomain, $(if ($Apply) { 'APPLY' } else { 'PREVIEW' })) -ForegroundColor Green

# ---------- Read metaobject entries ----------
function Get-Entries($type) {
  $out = @(); $c = $null
  do {
    $d = (Gql 'query($t: String!, $c: String) { metaobjects(type: $t, first: 100, after: $c) { pageInfo { hasNextPage endCursor } nodes { id handle fields { key value } } } }' @{ t = $type; c = $c }).metaobjects
    $out += @($d.nodes); $c = $d.pageInfo.endCursor
  } while ($d.pageInfo.hasNextPage)
  $out
}
function FieldMap($node) { $h = [ordered]@{}; foreach ($f in $node.fields) { if ($null -ne $f.value) { $h[$f.key] = $f.value } }; $h }
function Same($a, $b) { ($a | ConvertTo-Json -Compress) -eq ($b | ConvertTo-Json -Compress) }

$UPSERT = 'mutation($h: MetaobjectHandleInput!, $m: MetaobjectUpsertInput!) { metaobjectUpsert(handle: $h, metaobject: $m) { metaobject { id handle } userErrors { field message code } } }'
$existing = @{}
foreach ($t in 'pdp_video', 'pdp_resource', 'pdp_policy', 'pdp_variant_url') {
  $existing[$t] = @{}; foreach ($n in (Get-Entries $t)) { $existing[$t][$n.handle] = @{ id = $n.id; fields = (FieldMap $n) } }
}
$stats = [ordered]@{}
function Count($k) { if (-not $stats.Contains($k)) { $stats[$k] = 0 }; $stats[$k]++ }

# Creates or updates one entry. Returns its ID (a placeholder in preview).
function Put-Entry($type, $handle, $fields) {
  $have = $existing[$type][$handle]
  if ($have -and (Same $have.fields $fields)) { Count "$type same"; return $have.id }
  Count "$type $(if ($have) { 'update' } else { 'create' })"
  if (-not $Apply) { return "<$type/$handle>" }
  $m = @{ fields = @($fields.GetEnumerator() | ForEach-Object { @{ key = $_.Key; value = [string]$_.Value } }) }
  $p = (Gql $UPSERT @{ h = @{ type = $type; handle = $handle }; m = $m }).metaobjectUpsert
  Assert-Ok $p "upsert $type/$handle"
  $existing[$type][$handle] = @{ id = $p.metaobject.id; fields = $fields }
  $p.metaobject.id
}

# ---------- 1. variant_url -> pdp_variant_url ----------
Write-Host "`n== Variant URLs ==" -ForegroundColor Cyan
foreach ($n in (Get-Entries 'variant_url')) { [void](Put-Entry 'pdp_variant_url' $n.handle (FieldMap $n)) }

# ---------- 2. expert_reviews -> pdp_video ----------
Write-Host "== Videos ==" -ForegroundColor Cyan
$videoMap = @{}
$keep = 'title', 'video_url', 'video', 'thumbnail', 'source_name', 'source_icon'
foreach ($n in $(if ($IncludeVideos) { Get-Entries 'expert_reviews' } else { Write-Host '  skipped (use -IncludeVideos to copy)'; @() })) {
  $src = FieldMap $n; $f = [ordered]@{}
  foreach ($k in $keep) { if ($src.Contains($k)) { $f[$k] = $src[$k] } }
  if (-not $f.Contains('title')) { $f['title'] = $n.handle }
  if ($src.Contains('view_count')) {
    $vc = "$($src['view_count'])" -replace '[,\s]', ''
    if ($vc -match '^\d+$') { $f['view_count'] = $vc } else { Write-Host "  note: $($n.handle) view_count '$($src['view_count'])' is not a whole number, left out" -ForegroundColor DarkYellow }
  }
  $videoMap[$n.id] = Put-Entry 'pdp_video' $n.handle $f
}

# ---------- 3. Products ----------
$PQ = @'
query($c: String) { products(first: 10, after: $c) { pageInfo { hasNextPage endCursor } nodes { id handle vendor
  specs: metafield(namespace: "custom", key: "specs") { value }
  faq: metafield(namespace: "custom", key: "faq") { value }
  steps: metafield(namespace: "custom", key: "pdp_steps") { value }
  articles: metafield(namespace: "custom", key: "related_articles") { value }
  bought: metafield(namespace: "custom", key: "frequently_bought_together") { value }
  banner: metafield(namespace: "custom", key: "pdp_banner") { value }
  manual: metafield(namespace: "custom", key: "owners_manual") { value reference { ... on GenericFile { url } } }
  video: metafield(namespace: "custom", key: "assembly_video") { value }
  hmin: metafield(namespace: "custom", key: "handling_days_min") { value }
  hmax: metafield(namespace: "custom", key: "handling_days_max") { value }
  transit: metafield(namespace: "custom", key: "transit_extra_days") { value }
  badges: metafield(namespace: "custom", key: "trust_badges") { references(first: 20) { nodes { ... on Metaobject { id type } } } }
  reassure: metafield(namespace: "custom", key: "reassurance") { references(first: 20) { nodes { ... on Metaobject { id type } } } }
  reviews: metafield(namespace: "custom", key: "expert_reviews") { references(first: 20) { nodes { ... on Metaobject { id } } } }
  pdp: metafields(namespace: "pdp", first: 20) { nodes { key value } }
} } }
'@
Write-Host "== Products ==" -ForegroundColor Cyan
$writes = [System.Collections.Generic.List[object]]::new()
$c = $null; $nProducts = 0
do {
  $d = (Gql $PQ @{ c = $c }).products
  foreach ($p in $d.nodes) {
    $nProducts++
    $cur = @{}; foreach ($m in $p.pdp.nodes) { $cur[$m.key] = $m.value }
    $want = [ordered]@{}

    foreach ($pair in @(@('specs', 'specs', 'json'), @('faq', 'faq', 'json'), @('steps', 'steps', 'json'),
                         @('articles', 'articles', 'list.article_reference'), @('bought', 'bought_together', 'list.product_reference'),
                         @('banner', 'banner', 'metaobject_reference'))) {
      $v = $p.($pair[0]).value
      if ($v) { $want[$pair[1]] = @{ type = $pair[2]; value = $v } }
    }

    # Manual + video -> shared pdp_resource
    $man = $p.manual.value; $vid = $p.video.value
    if ($man -or $vid) {
      $name = if ($p.manual.reference.url) { [uri]::UnescapeDataString((($p.manual.reference.url -split '\?')[0] -split '/')[-1]) -replace '\.pdf$', '' -replace '[_+]', ' ' } else { 'Video only' }
      $f = [ordered]@{ name = $name }; if ($man) { $f['manual'] = $man }; if ($vid) { $f['video'] = $vid }
      $id = Put-Entry 'pdp_resource' ("res-" + (Hash8 "$man|$vid")) $f
      $want['resources'] = @{ type = 'metaobject_reference'; value = $id }
    }

    # Delivery days + badges -> shared pdp_policy
    $all = @($p.badges.references.nodes) + @($p.reassure.references.nodes) | Where-Object { $_ -and $_.id }
    $bad = @($all | Where-Object { $_.type -eq 'trust_badge' } | ForEach-Object { $_.id } | Select-Object -Unique)
    $rea = @($all | Where-Object { $_.type -eq 'reassurance_item' } | ForEach-Object { $_.id } | Select-Object -Unique)
    $other = @($all | Where-Object { $_.type -notin 'trust_badge', 'reassurance_item' })
    if ($other.Count) { Write-Host "  note: $($p.handle) has badge entries of type $(($other.type | Select-Object -Unique) -join ', '), left out" -ForegroundColor DarkYellow }
    $hmin = $p.hmin.value; $hmax = $p.hmax.value; $tr = $p.transit.value
    if ($hmin -or $hmax -or $tr -or $bad.Count -or $rea.Count) {
      $f = [ordered]@{ name = "$($p.vendor) policy" }
      if ($hmin) { $f['handling_min'] = $hmin }; if ($hmax) { $f['handling_max'] = $hmax }; if ($tr) { $f['transit_extra'] = $tr }
      if ($bad.Count) { $f['badges'] = (ConvertTo-Json @($bad) -Compress) }
      if ($rea.Count) { $f['reassurance'] = (ConvertTo-Json @($rea) -Compress) }
      $key = "$hmin|$hmax|$tr|$($bad -join ',')|$($rea -join ',')"
      $id = Put-Entry 'pdp_policy' ("policy-" + (Slug $p.vendor) + "-" + (Hash8 $key)) $f
      $want['policy'] = @{ type = 'metaobject_reference'; value = $id }
    }

    # Expert reviews -> pdp.videos
    $vids = @($p.reviews.references.nodes | Where-Object { $_ -and $_.id } | ForEach-Object { $videoMap[$_.id] } | Where-Object { $_ })
    if ($vids.Count) { $want['videos'] = @{ type = 'list.metaobject_reference'; value = (ConvertTo-Json @($vids) -Compress) } }

    foreach ($k in $want.Keys) {
      if ($cur[$k] -eq $want[$k].value) { Count "pdp.$k same"; continue }
      Count "pdp.$k $(if ($cur.ContainsKey($k)) { 'update' } else { 'set' })"
      $writes.Add(@{ ownerId = $p.id; namespace = 'pdp'; key = $k; type = $want[$k].type; value = $want[$k].value; handle = $p.handle })
    }
  }
  $c = $d.pageInfo.endCursor
} while ($d.pageInfo.hasNextPage)

# ---------- 4. Write product fields ----------
if ($Apply -and $writes.Count) {
  $SET = 'mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { metafields { id } userErrors { field message code } } }'
  for ($i = 0; $i -lt $writes.Count; $i += 25) {
    $batch = @($writes[$i..([Math]::Min($i + 24, $writes.Count - 1))] | ForEach-Object { @{ ownerId = $_.ownerId; namespace = 'pdp'; key = $_.key; type = $_.type; value = $_.value } })
    $p = (Gql $SET @{ m = $batch }).metafieldsSet
    Assert-Ok $p "metafieldsSet batch at $i"
  }
}

# ---------- Summary ----------
Write-Host "`n== Summary ($nProducts products) ==" -ForegroundColor Cyan
$stats.GetEnumerator() | Sort-Object Key | ForEach-Object { "  {0,-28} {1,5}" -f $_.Key, $_.Value }
Write-Host ("`n{0} product field writes {1}." -f $writes.Count, $(if ($Apply) { 'done' } else { 'planned' })) -ForegroundColor Green
if (-not $Apply) { Write-Host 'Preview only. Re-run with -Apply to write.' -ForegroundColor Green }
