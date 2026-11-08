$root = Split-Path -Parent $PSScriptRoot
$l = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
if ($l) { "already listening on 3000 (pid $($l[0].OwningProcess)); leaving it alone"; return }
Start-Process pwsh -ArgumentList '-NoExit','-Command',"Set-Location '$root'; pnpm dev 2>&1 | Tee-Object dev.log"
"started in its own window. Leave that window alone."
foreach ($i in 1..60) {
  Start-Sleep -Seconds 5
  if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) { "up after $($i*5)s"; return }
}
"not listening after 5 minutes: read dev.log"
