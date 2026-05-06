# Contrato Grasshopper Para Pricing Lab

Este arquivo define o minimo que a definicao Grasshopper precisa fazer para alimentar a tabela local de precificacao.

## Entrada principal

Arquivo:

```text
pricing-lab/inputs/sample-grid.csv
```

Colunas usadas pela primeira familia:

- `family_slug`
- `sample_id`
- `diametro_interno_mm`
- `diametro_base_mm`
- `profundidade_insercao_mm`
- `altura_apoio_mm`
- `quantity`
- `stl_file`
- `notes`

## Saida esperada

Para cada linha ativa da familia, exportar um STL em:

```text
pricing-lab/stl/{family_slug}/{stl_file}
```

Exemplo:

```text
pricing-lab/stl/ponteira-interna-tubo-redondo/ponteira-interna-tubo-redondo__RD-PI-DI22-DB28-P18-A8.stl
```

## Parametros tecnicos minimos

A definicao Grasshopper deve aplicar estes defaults antes de gerar a malha:

- `fitAllowanceMm`: -0.2
- `topChamferMm`: 0.8
- `baseBottomChamferMm`: 0.6
- `shoulderRadiusMm`: 1.2
- `meshToleranceMm`: 0.15

## Checklist por STL

Antes de fatiar, conferir:

- arquivo exportado em milimetros;
- malha fechada quando aplicavel;
- nome igual ao `stl_file` da grade;
- uma unidade por STL no v1, a menos que `quantity` seja deliberadamente modelado em lote;
- orientacao de impressao padrao ja pensada para o perfil Orca.

## Fluxo manual minimo

1. Abrir Rhino + Grasshopper.
2. Carregar `sample-grid.csv`.
3. Filtrar uma familia, comecando por `ponteira-interna-tubo-redondo`.
4. Gerar geometria por linha.
5. Exportar STLs para `pricing-lab/stl/{family_slug}/`.
6. Rodar `pricing-lab/scripts/slice-with-orca.ps1`.
7. Rodar `pricing-lab/scripts/extract-gcode-metrics.mjs`.
8. Abrir `pricing-lab/pricing-lab.xlsx` para revisar custo/preco.
