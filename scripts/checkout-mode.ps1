param([Parameter(Mandatory)][ValidateSet('stripe','shopify','status')]$mode)
if(-not (Test-Path .env)){ Write-Host '.env not found. Stopping.'; exit 1 }
$lines = Get-Content .env
if($mode -ne 'status'){
  Copy-Item .env "$env:TEMP\env-backup-$(Get-Date -Format yyyyMMdd-HHmmss).bak" -Force
  $val = if($mode -eq 'stripe'){'true'}else{'false'}
  $found = $false
  $lines = foreach($l in $lines){
    if($l -match '^\s*STRIPE_CHECKOUT_ENABLED\s*='){ $found = $true; "STRIPE_CHECKOUT_ENABLED=$val" } else { $l }
  }
  if(-not $found){ $lines = @($lines) + "STRIPE_CHECKOUT_ENABLED=$val" }
  Set-Content .env $lines
  $lines = Get-Content .env
}
$flag = ($lines | Where-Object { $_ -match '^\s*STRIPE_CHECKOUT_ENABLED\s*=' } | Select-Object -First 1) -replace '^\s*STRIPE_CHECKOUT_ENABLED\s*=\s*','' -replace '^["'']|["'']$',''
$sk = [bool]($lines | Where-Object { $_ -match '^\s*STRIPE_SECRET_KEY\s*=\s*\S' })
$pk = [bool]($lines | Where-Object { $_ -match '^\s*PUBLIC_STRIPE_PUBLISHABLE_KEY\s*=\s*\S' })
Write-Host "STRIPE_CHECKOUT_ENABLED = $flag"
Write-Host "STRIPE_SECRET_KEY set: $sk | PUBLIC_STRIPE_PUBLISHABLE_KEY set: $pk"
if($flag.Trim() -eq 'true' -and $sk -and $pk){ Write-Host 'Active mode: STRIPE (inline card form)' } else { Write-Host 'Active mode: SHOPIFY (checkout button)' }
Write-Host 'Restart the dev server for the change to take effect.'
