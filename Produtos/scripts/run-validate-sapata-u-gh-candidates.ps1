$ErrorActionPreference = "Stop"

$repo = $env:TRACO_BASE_REPO
if (-not $repo) {
  $repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$env:TRACO_BASE_REPO = $repo
$script = Join-Path $repo "Produtos\scripts\validate-sapata-u-gh-candidates.py"

$rhino = New-Object -ComObject Rhino.Application
try {
  $rhino.Visible = $false
  Start-Sleep -Seconds 5
  $rhino.RunScript('-_RunPythonScript ("' + $script + '")', 0) | Out-Null
} finally {
  try { $rhino.RunScript('-_Exit _No', 0) | Out-Null } catch {}
}
