# Scripts

Espaco para automacoes locais do pricing lab.

Scripts disponiveis:

- `slice-with-orca.ps1`: chama Orca Slicer para cada STL em `stl/`.
- `extract-gcode-metrics.mjs`: le G-code e atualiza `results/orca-results.csv`.
- `build-workbook.mjs`: recria `pricing-lab.xlsx` a partir dos CSVs.

Esses scripts devem ser locais/offline. Eles nao precisam importar codigo do site nem depender do admin.

## Uso

```powershell
$env:ORCA_SLICER_PATH="C:\Program Files\OrcaSlicer\OrcaSlicer.exe"
.\pricing-lab\scripts\slice-with-orca.ps1 -FamilySlug ponteira-interna-tubo-redondo
node .\pricing-lab\scripts\extract-gcode-metrics.mjs
```

Depois de atualizar `results/orca-results.csv`, recrie a planilha:

```powershell
node .\pricing-lab\scripts\build-workbook.mjs
```
