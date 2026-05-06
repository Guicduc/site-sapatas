param(
  [string]$OrcaPath = $env:ORCA_SLICER_PATH,
  [string]$ProfilePath = $env:ORCA_SLICER_LOAD_SETTINGS,
  [string]$ProfileId = "tpu-default",
  [string]$FamilySlug = "",
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$sampleGridPath = Join-Path $root "inputs\sample-grid.csv"
$stlRoot = Join-Path $root "stl"
$gcodeRoot = Join-Path $root "gcode"

if (-not $OrcaPath) {
  throw "Informe -OrcaPath ou configure ORCA_SLICER_PATH com o caminho do OrcaSlicer.exe."
}

if (-not (Test-Path -LiteralPath $OrcaPath -PathType Leaf)) {
  throw "Orca Slicer nao encontrado em: $OrcaPath"
}

if (-not (Test-Path -LiteralPath $sampleGridPath -PathType Leaf)) {
  throw "sample-grid.csv nao encontrado em: $sampleGridPath"
}

$rows = Import-Csv -LiteralPath $sampleGridPath

if ($FamilySlug) {
  $rows = $rows | Where-Object { $_.family_slug -eq $FamilySlug }
}

foreach ($row in $rows) {
  $family = $row.family_slug
  $stlFile = $row.stl_file

  if (-not $family -or -not $stlFile) {
    continue
  }

  $stlPath = Join-Path (Join-Path $stlRoot $family) $stlFile
  $outputDir = Join-Path $gcodeRoot $family

  if (-not (Test-Path -LiteralPath $stlPath -PathType Leaf)) {
    Write-Warning "STL ausente: $stlPath"
    continue
  }

  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

  $args = @()

  if ($ProfilePath) {
    if (-not (Test-Path -LiteralPath $ProfilePath -PathType Leaf)) {
      throw "Perfil Orca nao encontrado em: $ProfilePath"
    }

    $args += @("--load-settings", $ProfilePath)
  }

  $args += @("--export-gcode", "--outputdir", $outputDir, $stlPath)

  Write-Host "Fatiando $family / $($row.sample_id) com perfil $ProfileId"
  Write-Host "$OrcaPath $($args -join ' ')"

  if (-not $WhatIf) {
    & $OrcaPath @args

    if ($LASTEXITCODE -ne 0) {
      throw "Orca falhou para $stlPath com exit code $LASTEXITCODE"
    }
  }
}
