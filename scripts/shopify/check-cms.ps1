$shop = 'ecombio.myshopify.com'
$envFile = Join-Path $PSScriptRoot '.cms.env'
if (-not (Test-Path $envFile)) { throw "Missing $envFile" }
Get-Content $envFile | Where-Object { $_ -match '^\s*[^#=\s]+=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2
  Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim()
}
$resp = Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{ grant_type='client_credentials'; client_id=$env:CMS_CLIENT_ID; client_secret=$env:CMS_CLIENT_SECRET }
$headers = @{ 'X-Shopify-Access-Token' = $resp.access_token }
$uri = "https://$shop/admin/api/2026-07/graphql.json"
function Gql($q) { Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType 'application/json' -Body (@{query=$q} | ConvertTo-Json) }
'--- SCOPES ---'
(Gql 'query { currentAppInstallation { accessScopes { handle } } }').data.currentAppInstallation.accessScopes.handle | Sort-Object
'--- ORDERS ---'
$r = Gql 'query { orders(first: 5, reverse: true) { nodes { name createdAt customAttributes { key value } } } }'
if ($r.errors) { $r.errors | ConvertTo-Json -Depth 5 } else {
  $r.data.orders.nodes | ForEach-Object { "{0}  {1}  storefront={2}" -f $_.name, $_.createdAt, (($_.customAttributes | Where-Object key -eq 'storefront').value) }
}
