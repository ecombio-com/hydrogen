#requires -Version 7
<#
  black-friday-tag.ps1
  Adds the tag "black-friday" to the picked products (matched by title prefix) on khkkyb-b8.
  Stops if any pick matches 0 or 2+ products. Only adds a tag; nothing else changes.
  Usage:
    pwsh scripts\shopify\black-friday-tag.ps1 -DryRun
    pwsh scripts\shopify\black-friday-tag.ps1
#>
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'

$Shop       = 'khkkyb-b8.myshopify.com'
$ApiVersion = '2026-10'
$Tag        = 'black-friday'

$Picks = @(
  'Aventon Soltera 2.5 Ebike'
  'Aventon Soltera 3 ADV'
  'Aventon Aventure.3 E-Bike Step-Over'
  'Aventon Aventure.3 E-Bike Step-Through'
  'Urtopia CARBON 1 PRO E-Bike'
  'Urtopia Carbon Joy Ultra'
  'VTUVIA CMB 8-Speed Ebike'
  'VTUVIA SX20 Folding Ebike'
  'eBike Boys Fat Tire Electric Bike - 1200W, Dual Suspension'
  'eBike Boys COROMA Electric Scooter'
  'eBike Boys 48V Foldable Electric Scooter'
  'eBike Boys RT6 1000W Electric Scooter'
  'VICAN Foldable 48V Electric Scooter'
  'HX X9 PLUS Electric Scooter - Foldable, 60-80km Range, 10-inch'
  'Obarter D5 5000W Electric Scooter'
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

$all = @(); $after = $null
do {
  $p = (Invoke-Gql 'query ($a: String) { products(first: 100, after: $a, query: "status:active") { pageInfo { hasNextPage endCursor } nodes { id title tags } } }' @{ a = $after }).products
  $all += $p.nodes; $after = $p.pageInfo.endCursor
} while ($p.pageInfo.hasNextPage)

$targets = foreach ($pick in $Picks) {
  $m = @($all | Where-Object { $_.title.StartsWith($pick, [StringComparison]::OrdinalIgnoreCase) })
  if ($m.Count -ne 1) { throw "'$pick' matched $($m.Count) products (need exactly 1)." }
  $m[0]
}

Write-Host "Products to tag '$Tag':"
$targets | ForEach-Object {
  $note = if ($_.tags -contains $Tag) { ' (already tagged)' } else { '' }
  Write-Host "  + $($_.title)$note"
}

if ($DryRun) { Write-Host "`nDry run: nothing changed."; return }

foreach ($t in $targets) {
  $r = (Invoke-Gql 'mutation ($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { field message } } }' @{ id = $t.id; tags = @($Tag) }).tagsAdd
  if ($r.userErrors.Count) { throw ($r.userErrors | ConvertTo-Json -Depth 10) }
}
Write-Host "`nTagged $(@($targets).Count) products."
