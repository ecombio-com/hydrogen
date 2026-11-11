param([switch]$AllowLive)
$root = Split-Path -Parent $PSScriptRoot
$dom = ((Get-Content "$root\.env" | Where-Object { $_ -match '^\s*PUBLIC_STORE_DOMAIN\s*=' } | Select-Object -First 1) -replace '^[^=]*=\s*', '' -replace '["'']', '').Trim()
if ($dom -ne 'ecombio.myshopify.com' -and -not $AllowLive) {
  "REFUSING to start: .env targets '$dom', which is not the dev store. Run .\scripts\use-env.ps1 dev, or pass -AllowLive."
  return
}
$l = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
if ($l) { "already listening on 3000 (pid $($l[0].OwningProcess)); leaving it alone"; return }
Start-Process pwsh -ArgumentList '-NoExit','-Command',"Set-Location '$root'; pnpm dev 2>&1 | Tee-Object dev.log"
"started in its own window. Leave that window alone."
foreach ($i in 1..60) {
  Start-Sleep -Seconds 5
  if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) { "up after $($i*5)s"; return }
}
"not listening after 5 minutes: read dev.log"
