$ErrorActionPreference = "Stop"

$repo = $env:TRACO_BASE_REPO
if (-not $repo) {
  $repo = "C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas"
}

$rhinoPath = $env:RHINO_EXE
if (-not $rhinoPath) {
  $rhinoPath = "C:\Program Files\Rhino 7\System\Rhino.exe"
}

$script = Join-Path $repo "Produtos\scripts\gh_export_variations.py"

if (-not (Test-Path -LiteralPath $rhinoPath)) {
  throw "Rhino nao encontrado em $rhinoPath"
}

if (-not (Test-Path -LiteralPath $script)) {
  throw "Script nao encontrado em $script"
}

$rhino = New-Object -ComObject Rhino.Application
$rhino.Visible = $true
Start-Sleep -Seconds 5
$command = '-_RunPythonScript ("' + $script + '")'
$rhino.RunScript($command, 0) | Out-Null

Write-Host "Exportacao iniciada no Rhino. Verifique Produtos\logs\grasshopper_3mf_variations.log"
