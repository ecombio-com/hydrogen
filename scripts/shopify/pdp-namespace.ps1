# pdp-namespace.ps1
# Step 3a of the pdp.* rename: creates the new pdp_* metaobject types and pdp.* product metafield definitions.
# Creates definitions only. It copies no values and deletes nothing.
# Preview by default. Add -Apply to create. Safe to re-run: anything that already exists is skipped.
#
#   pwsh -File scripts\shopify\pdp-namespace.ps1               # prod, preview
#   pwsh -File scripts\shopify\pdp-namespace.ps1 -Apply        # prod, create
#   pwsh -File scripts\shopify\pdp-namespace.ps1 -Store dev    # dev store
param(
  [ValidateSet('prod', 'dev')][string]$Store = 'prod',
  [switch]$Apply
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

$s = (Gql '{ shop { name myshopifyDomain } }').shop
Write-Host ("Store: {0} ({1})  Mode: {2}" -f $s.name, $s.myshopifyDomain, $(if ($Apply) { 'APPLY' } else { 'PREVIEW' })) -ForegroundColor Green

$GET_TYPE = 'query($t: String!) { metaobjectDefinitionByType(type: $t) { id type fieldDefinitions { key name required type { name } validations { name value } } } }'
$CREATE_TYPE = 'mutation($d: MetaobjectDefinitionCreateInput!) { metaobjectDefinitionCreate(definition: $d) { metaobjectDefinition { id type } userErrors { field message code } } }'
$GET_MF = 'query { metafieldDefinitions(first: 100, ownerType: PRODUCT, namespace: "pdp") { nodes { key type { name } } } }'
$CREATE_MF = 'mutation($d: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $d) { createdDefinition { id namespace key } userErrors { field message code } } }'

$ids = @{}
$plan = [System.Collections.Generic.List[object]]::new()
function TypeId($t) {
  if ($ids.ContainsKey($t)) { return $ids[$t] }
  $d = (Gql $GET_TYPE @{ t = $t }).metaobjectDefinitionByType
  $ids[$t] = if ($d) { $d.id } else { $null }
  $ids[$t]
}
function Ref($t) { $id = TypeId $t; if (-not $id) { $id = "<new $t>" }; ,@(@{ name = 'metaobject_definition_id'; value = $id }) }

# ---------- 1. Metaobject types ----------
# variant_url fields are copied as-is, so set-variant-urls.mjs keeps working after the switch.
$vu = (Gql $GET_TYPE @{ t = 'variant_url' }).metaobjectDefinitionByType
if (-not $vu) { throw 'variant_url type not found in this store. Stopping.' }
$vuFields = @($vu.fieldDefinitions | ForEach-Object {
  $f = @{ key = $_.key; name = $_.name; type = $_.type.name; required = [bool]$_.required }
  if ($_.validations) { $f.validations = @($_.validations | ForEach-Object { @{ name = $_.name; value = $_.value } }) }
  $f
})

$types = @(
  @{ type = 'pdp_policy'; name = 'PDP policy'; displayNameKey = 'name'
     description = 'Shipping times, returns, warranty and badges. One entry per supplier, shared by many products.'
     fieldDefinitions = @(
       @{ key = 'name'; name = 'Name'; type = 'single_line_text_field'; required = $true },
       @{ key = 'handling_min'; name = 'Handling days (min)'; type = 'number_integer' },
       @{ key = 'handling_max'; name = 'Handling days (max)'; type = 'number_integer' },
       @{ key = 'transit_extra'; name = 'Extra transit days'; type = 'number_integer' },
       @{ key = 'shipping'; name = 'Shipping policy'; type = 'multi_line_text_field' },
       @{ key = 'returns'; name = 'Returns policy'; type = 'multi_line_text_field' },
       @{ key = 'warranty'; name = 'Warranty'; type = 'multi_line_text_field' },
       @{ key = 'badges'; name = 'Trust badges'; type = 'list.metaobject_reference'; validations = (Ref 'trust_badge') },
       @{ key = 'reassurance'; name = 'Reassurance'; type = 'list.metaobject_reference'; validations = (Ref 'reassurance_item') }
     ) },
  @{ type = 'pdp_resource'; name = 'PDP resource'; displayNameKey = 'name'
     description = "Owner's manual and assembly video. One entry per manual, shared by sibling products."
     fieldDefinitions = @(
       @{ key = 'name'; name = 'Name'; type = 'single_line_text_field'; required = $true },
       @{ key = 'manual'; name = "Owner's manual"; type = 'file_reference' },
       @{ key = 'video'; name = 'Assembly video'; type = 'url' },
       @{ key = 'source'; name = 'Source article'; type = 'url' }
     ) },
  @{ type = 'pdp_video'; name = 'PDP video'; displayNameKey = 'title'
     description = 'A product video or an outside expert video review.'
     fieldDefinitions = @(
       @{ key = 'title'; name = 'Title'; type = 'single_line_text_field'; required = $true },
       @{ key = 'video_url'; name = 'Video URL'; type = 'url' },
       @{ key = 'video'; name = 'Video file'; type = 'file_reference' },
       @{ key = 'thumbnail'; name = 'Thumbnail'; type = 'file_reference' },
       @{ key = 'caption'; name = 'Caption'; type = 'multi_line_text_field' },
       @{ key = 'source_name'; name = 'Source name'; type = 'single_line_text_field' },
       @{ key = 'source_icon'; name = 'Source icon'; type = 'file_reference' },
       @{ key = 'view_count'; name = 'View count'; type = 'number_integer' }
     ) },
  @{ type = 'pdp_variant_url'; name = 'PDP variant URL'; description = 'One SEO URL per product variant.'; fieldDefinitions = $vuFields }
)

Write-Host "`n== Metaobject types ==" -ForegroundColor Cyan
foreach ($t in $types) {
  if (TypeId $t.type) { Write-Host "  skip    $($t.type) (exists)"; continue }
  $t.access = @{ storefront = 'PUBLIC_READ' }
  Write-Host "  create  $($t.type)  [$((@($t.fieldDefinitions) | ForEach-Object { $_.key }) -join ', ')]" -ForegroundColor Yellow
  if ($Apply) {
    $p = (Gql $CREATE_TYPE @{ d = $t }).metaobjectDefinitionCreate
    Assert-Ok $p "create $($t.type)"
    $ids[$t.type] = $p.metaobjectDefinition.id
    Write-Host "  ok      $($t.type)" -ForegroundColor Green
  }
}

# ---------- 2. Product metafields (namespace pdp) ----------
$mfs = @(
  @{ key = 'specs'; name = 'Specs (JSON)'; type = 'json' },
  @{ key = 'faq'; name = 'FAQ (JSON)'; type = 'json' },
  @{ key = 'steps'; name = 'Steps (JSON)'; type = 'json' },
  @{ key = 'policy'; name = 'Policy'; type = 'metaobject_reference'; validations = (Ref 'pdp_policy') },
  @{ key = 'resources'; name = 'Manual and video'; type = 'metaobject_reference'; validations = (Ref 'pdp_resource') },
  @{ key = 'videos'; name = 'Videos'; type = 'list.metaobject_reference'; validations = (Ref 'pdp_video') },
  @{ key = 'articles'; name = 'Articles (guides and reviews)'; type = 'list.article_reference' },
  @{ key = 'bought_together'; name = 'Bought together'; type = 'list.product_reference' },
  @{ key = 'banner'; name = 'Banner'; type = 'metaobject_reference'; validations = (Ref 'pdp_banner') }
)
$have = @{}; (Gql $GET_MF).metafieldDefinitions.nodes | ForEach-Object { $have[$_.key] = $_.type.name }

Write-Host "`n== Product metafields (pdp.*) ==" -ForegroundColor Cyan
foreach ($m in $mfs) {
  if ($have.ContainsKey($m.key)) { Write-Host "  skip    pdp.$($m.key) (exists as $($have[$m.key]))"; continue }
  Write-Host ("  create  pdp.{0,-16} {1}" -f $m.key, $m.type) -ForegroundColor Yellow
  if ($Apply) {
    $d = @{ namespace = 'pdp'; key = $m.key; name = $m.name; type = $m.type; ownerType = 'PRODUCT'; access = @{ storefront = 'PUBLIC_READ' } }
    if ($m.validations) { $d.validations = @($m.validations | ForEach-Object { if ($_.value -like '<new*') { @{ name = $_.name; value = $ids[($_.value -replace '^<new |>$', '')] } } else { $_ } }) }
    $p = (Gql $CREATE_MF @{ d = $d }).metafieldDefinitionCreate
    Assert-Ok $p "create pdp.$($m.key)"
    Write-Host "  ok      pdp.$($m.key)" -ForegroundColor Green
  }
}

Write-Host "`nDone. $(if ($Apply) { 'Created what was missing.' } else { 'Preview only. Re-run with -Apply to create.' })" -ForegroundColor Green
