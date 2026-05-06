# Pricing Lab

Ambiente local para gerar uma tabela de precificacao baseada em Grasshopper + Orca Slicer.

Este fluxo nao depende do site, servidor, admin ou checkout. A ideia e produzir uma base tecnica de medidas, STLs, tempo de impressao e consumo de material para depois alimentar o preco do configurador.

## Fluxo recomendado

1. Definir uma familia e uma grade de medidas em `inputs/sample-grid.csv`.
2. Usar Grasshopper para ler a grade e exportar um STL por linha.
3. Salvar os STLs em `stl/{familia}/`.
4. Fatiar os STLs localmente no Orca Slicer, manualmente ou por script.
5. Salvar G-code em `gcode/{familia}/`.
6. Registrar tempo, gramas e observacoes em `results/orca-results.csv`.
7. Consolidar custo e preco na planilha `pricing-lab.xlsx`.

## Estrutura

- `inputs/`: grades de medidas, assumptions e manifestos de familia.
- `stl/`: STLs exportados pelo Grasshopper, separados por familia.
- `gcode/`: G-codes gerados pelo Orca Slicer, separados por familia.
- `results/`: resultados extraidos do Orca e tabelas consolidadas.
- `scripts/`: scripts locais para gerar grid, chamar Orca e extrair dados.
- `pricing-lab.xlsx`: workbook de trabalho com abas para assumptions, amostras, resultados e precificacao.

## Convencao de arquivo

Use o mesmo `sample_id` em todos os artefatos.

```text
{family_slug}__{sample_id}.stl
{family_slug}__{sample_id}.gcode
```

Exemplo:

```text
ponteira-interna-tubo-redondo__RD-PI-DI22-DB28-P18-A8.stl
ponteira-interna-tubo-redondo__RD-PI-DI22-DB28-P18-A8.gcode
```

## O que o Grasshopper precisa expor

Para cada familia, a definicao precisa aceitar:

- `sample_id`
- parametros dimensionais em mm
- quantidade de unidades por amostra, quando a geometria ja vier em lote
- pasta de saida STL
- nome final do arquivo STL

A definicao tambem deve aplicar os defaults tecnicos da familia, como folga de encaixe, chanfros, raio de ombro e tolerancia de malha.

## O que o Orca precisa manter fixo

Para os dados serem comparaveis, use sempre o mesmo perfil por rodada:

- impressora
- bico
- material TPU
- altura de camada
- paredes
- preenchimento
- velocidades
- suporte
- brim/raft/skirt

Se qualquer um desses itens mudar, registre `profile_id` novo em `inputs/assumptions.csv`.
