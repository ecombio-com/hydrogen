#requires -Version 7
<#
  black-friday-collection.ps1
  Creates the "Black Friday" smart collection (handle black-friday, rule: tag = black-friday)
  on khkkyb-b8 and publishes it to every sales channel. Skips creation if it already exists.
  Usage:
    pwsh scripts\shopify\black-friday-collection.ps1 -DryRun
    pwsh scripts\shopify\black-friday-collection.ps1
#>
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'

$Shop       = 'khkkyb-b8.myshopify.com'
$ApiVersion = '2026-10'
$Handle     = 'black-friday'
$Title      = 'Black Friday'
$Tag        = 'black-friday'

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

$existing = (Invoke-Gql 'query ($h: String!) { collectionByHandle(handle: $h) { id title productsCount { count } } }' @{ h = $Handle }).collectionByHandle
$pubs = (Invoke-Gql 'query { publications(first: 50) { nodes { id name } } }' @{}).publications.nodes

$pubs = @($pubs | Where-Object { $_.name -in @('ecombio.com', 'ScooterBio', 'BicycleBio') }); Write-Host "Sales channels to publish to:"
$pubs | ForEach-Object { Write-Host "  - $($_.name)" }

if ($existing) {
  Write-Host "`nCollection already exists: $($existing.title) ($($existing.productsCount.count) products)"
  $collectionId = $existing.id
} else {
  Write-Host "`nWill create: $Title (/collections/$Handle), products tagged '$Tag'"
  if ($DryRun) { Write-Host "`nDry run: nothing changed."; return }

  $create = (Invoke-Gql 'mutation ($input: CollectionInput!) {
    collectionCreate(input: $input) { collection { id handle } userErrors { field message } }
  }' @{ input = @{
      title = $Title
      handle = $Handle
      descriptionHtml = '<p>Black Friday deals on e-bikes, e-scooters and electric skateboards.</p>'
      ruleSet = @{ appliedDisjunctively = $false; rules = @(@{ column = 'TAG'; relation = 'EQUALS'; condition = $Tag }) }
  } }).collectionCreate
  if ($create.userErrors.Count) { throw ($create.userErrors | ConvertTo-Json -Depth 10) }
  $collectionId = $create.collection.id
  Write-Host "Created: /collections/$($create.collection.handle)"
}

if ($DryRun) { Write-Host "`nDry run: nothing changed."; return }

$pub = (Invoke-Gql 'mutation ($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}' @{ id = $collectionId; input = @($pubs | ForEach-Object { @{ publicationId = $_.id } }) }).publishablePublish
if ($pub.userErrors.Count) { throw ($pub.userErrors | ConvertTo-Json -Depth 10) }
Write-Host "Published to $(@($pubs).Count) sales channels."
Write-Host "`nNext: tag deal products with '$Tag'."

