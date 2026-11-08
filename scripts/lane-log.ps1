param(
  [Parameter(Mandatory)][ValidateSet('A','B','C','D','E')][string]$Lane,
  [Parameter(Mandatory)][string]$Task,
  [Parameter(Mandatory)][ValidateSet('started','blocked','needs-approval','done')][string]$State,
  [string]$Note = ''
)
$root = Split-Path $PSScriptRoot -Parent
$dir  = Join-Path $root 'status\lanes'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir "$Lane.md"
if (-not (Test-Path $file)) {
  @("# Lane $Lane log", '', '| When | Task | State | Note |', '|---|---|---|---|') | Set-Content $file -Encoding utf8
}
$when  = Get-Date -Format 'yyyy-MM-dd HH:mm'
$clean = $Note -replace '\|', '/'
"| $when | $Task | $State | $clean |" | Add-Content $file -Encoding utf8
"Logged: Lane $Lane $Task $State"
