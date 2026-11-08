$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$out = @('== LANE LOGS ==')
Get-ChildItem 'status\lanes\*.md' -ErrorAction SilentlyContinue | ForEach-Object { $out += Get-Content $_.FullName; $out += '' }
$out += '== GIT STATUS =='
$out += git status --short
$out += '== RECENT COMMITS =='
$out += git log --oneline -15
$out | Set-Clipboard
'Lane report copied to clipboard'
