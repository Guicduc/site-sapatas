# Fluxo de exportacao 3MF via Grasshopper

Este documento descreve o fluxo recomendado para usar definicoes Grasshopper (`.gh`) como origem dos modelos 3MF da Traco Base e gerar dados tecnicos que alimentem a precificacao real dos produtos.

O objetivo e manter os scripts Grasshopper versionados em `Produtos/Scripts-GH/`, exportar um arquivo `.3mf` por variante e gerar uma tabela com volume, area, dimensoes e, depois do fatiamento, material e tempo de impressao.

## Estrutura neste projeto

Raiz do repositorio:

```text
C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas
```

Definicoes Grasshopper versionadas:

```text
Produtos\Scripts-GH\Sapata_Interna_Tubo-Oblongo.gh
Produtos\Scripts-GH\Sapata_Interna_Tubo-Quadrado.gh
Produtos\Scripts-GH\Sapata_Lisa_Quadrada-com haste.gh
Produtos\Scripts-GH\Sapata_Lisa_Quadrada-com parafuso.gh
Produtos\Scripts-GH\Sapata_Lisa_Quadrada.gh
Produtos\Scripts-GH\Sapata_Lisa_Redonda-com Haste.gh
Produtos\Scripts-GH\Sapata_Lisa_Redonda-com parafuso.gh
Produtos\Scripts-GH\Sapata_Lisa_Redonda.gh
```

Saidas recomendadas para os modelos gerados:

```text
Produtos\3MF\
Produtos\datasets\sapatas_3mf_dataset.csv
Produtos\logs\grasshopper_3mf_export.log
Produtos\slicer-output\
```

Essas pastas podem ser criadas quando o exportador for executado. Arquivos `.3mf` podem ser pesados; antes de versionar, confirme se eles devem entrar no Git ou se devem ser armazenados como artefatos externos.

## Dependencias locais

- Rhino 7 ou superior instalado no Windows.
- Grasshopper disponivel na instalacao do Rhino.
- Definicoes `.gh` sem dependencias externas quebradas.
- Python executado dentro do Rhino, com acesso a RhinoCommon e ao assembly do Grasshopper.

Quando um plugin antigo impedir a abertura das definicoes, desative apenas o plugin problematico no ambiente local e registre isso no log da execucao. Nao trate esse tipo de ajuste como requisito do projeto.

## Acionamento do Rhino

O fluxo validado usa automacao COM do Rhino via PowerShell. O script Python deve ficar em uma pasta operacional local ou em uma futura pasta versionada de automacoes do projeto.

Exemplo de chamada:

```powershell
$env:TRACO_BASE_REPO = "C:\Users\Administrador\.codex\worktrees\c35e\site-sapatas"
$env:GH_TARGET_VALID_PER_FILE = "120"
$env:GH_VARIATIONS_PER_FILE = "160"
npm run export:gh
```

Dentro do Python do Rhino, carregue o Grasshopper assim:

```python
import clr

clr.AddReferenceToFileAndPath(
    r"C:\Program Files\Rhino 7\Plug-ins\Grasshopper\Grasshopper.dll"
)
import Grasshopper
```

## Configuracao esperada do exportador

Use caminhos relativos a raiz do repositorio sempre que possivel:

```python
REPO_ROOT = os.environ.get(
    "TRACO_BASE_REPO",
    r"C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas"
)
GH_DIR = os.path.join(REPO_ROOT, "Produtos", "Scripts-GH")
OUT_DIR = os.path.join(REPO_ROOT, "Produtos", "3MF")
DATASET_PATH = os.path.join(REPO_ROOT, "Produtos", "datasets", "sapatas_3mf_dataset.csv")
LOG_PATH = os.path.join(REPO_ROOT, "Produtos", "logs", "grasshopper_3mf_export.log")
```

A lista de arquivos `.gh` deve ser montada a partir de `Produtos/Scripts-GH/`, nao de paths soltos na area de trabalho.

## Fluxo do script

1. Criar as pastas de saida (`Produtos/3MF`, `Produtos/datasets`, `Produtos/logs`).
2. Carregar o assembly do Grasshopper.
3. Para cada arquivo `.gh` em `Produtos/Scripts-GH/`:
   - limpar objetos existentes no documento Rhino;
   - abrir o documento com `GH_DocumentIO`;
   - resolver a definicao com `ghdoc.NewSolution(True)`;
   - percorrer as saidas dos componentes;
   - extrair geometrias RhinoCommon validas;
   - filtrar apenas solidos exportaveis;
   - remover duplicatas;
   - adicionar os solidos ao documento Rhino;
   - exportar cada solido individualmente para `.3mf`;
   - calcular metricas geometricas;
   - gravar uma linha no CSV.

## Funcoes importantes

### `load_grasshopper()`

Carrega o assembly do Grasshopper dentro da sessao Python do Rhino e disponibiliza o namespace `Grasshopper`.

### `bake_document(gh_path)`

Abre e resolve uma definicao `.gh`.

Responsabilidades:

- abrir o arquivo com `Grasshopper.Kernel.GH_DocumentIO`;
- chamar `NewSolution(True)`;
- percorrer objetos do documento Grasshopper;
- ler geometrias a partir de `Params.Output` e `VolatileData`;
- usar `BakeGeometry()` apenas como fallback quando disponivel;
- retornar os objetos Rhino adicionados ao documento.

### `geometry_from_goo(goo)`

Converte dados Grasshopper para `Rhino.Geometry.GeometryBase`.

Ordem recomendada:

1. tentar `goo.Value`;
2. tentar `goo.ScriptVariable()`;
3. copiar a geometria antes de adicionar ao documento Rhino.

### `is_exportable_solid(geom)`

Filtra geometrias que podem virar modelo 3D imprimivel:

- `Brep` solido;
- `Mesh` fechado;
- `Extrusion` convertida para `Brep` solido.

O filtro deve confirmar que `VolumeMassProperties.Compute()` retorna volume valido.

### `geometry_key(geom)`

Gera uma chave para evitar duplicatas. Use volume arredondado e bounding box nos eixos X, Y e Z.

### `export_3mf(path, ids)`

Seleciona apenas os objetos recebidos e executa:

```python
Rhino.RhinoApp.RunScript('-_Export "{}" _Enter'.format(path), False)
```

Cada arquivo `.3mf` deve conter somente a geometria correspondente a uma linha do dataset.

### `object_metrics(rhino_object)`

Campos minimos para o CSV:

- `source_gh`
- `model_id`
- `object_type`
- `volume_model_units3`
- `area_model_units2`
- `bbox_x`
- `bbox_y`
- `bbox_z`
- `export_path`

Campos desejados quando os parametros forem expostos no Grasshopper:

- `product_family`
- `variant_slug`
- `diametro`
- `tamanho_base_x`
- `tamanho_base_y`
- `altura_base`
- `altura_pescoco`
- `diametro_pescoco`
- `parede_tubo`
- `fixacao`

## Padrao recomendado para as definicoes Grasshopper

Para a base de custo ser confiavel, cada definicao deve expor explicitamente qual geometria e a peca final.

Padrao recomendado:

- nomear o parametro final como `EXPORT_3MF`;
- agrupar os componentes finais em um grupo chamado `EXPORT`;
- evitar que geometrias intermediarias fiquem conectadas a outputs publicos;
- nomear sliders/inputs com os mesmos nomes usados em `lib/configurator-data.js` sempre que possivel.

Nomes de parametros relevantes no app:

- `diametro`
- `diametroBase`
- `tamanhoBaseX`
- `tamanhoBaseY`
- `alturaBase`
- `alturaPescoco`
- `diametroPescoco`
- `paredeTubo`
- `pescoco`

## Relacao com o app

O configurador do site le parametros em:

```text
lib\configurator-data.js
```

A precificacao estimada e calculada no mesmo arquivo. Quando houver dados reais de fatiamento, eles devem alimentar:

```text
lib\sliced-pricing-data.js
lib\pricing-engine.js
```

Fluxo esperado para precificacao real:

1. Exportar `.3mf` a partir do Grasshopper.
2. Fatiar os modelos no Orca Slicer.
3. Extrair material e tempo de impressao do G-code ou relatorio do slicer.
4. Atualizar `lib/sliced-pricing-data.js` com as amostras aprovadas.
5. Conferir `calculatePriceBreakdown()` no configurador.

## Fatiamento em lote com Orca Slicer

O projeto inclui um script operacional para fatiar todos os modelos `.3mf` de `Produtos/3MF/` e gerar um CSV com os dados coletados do G-code:

```text
Produtos\scripts\orca-slice-dataset.mjs
```

Comando:

```powershell
npm run slice:dataset
```

Variaveis principais:

```text
ORCA_SLICER_PATH=C:\Program Files\OrcaSlicer\orca-slicer.exe
ORCA_MODEL_DIR=Produtos/3MF
ORCA_SLICER_OUTPUT_DIR=Produtos/slicer-output
ORCA_DATASET_PATH=Produtos/datasets/orca_tpu_p2s_220c_dataset.csv
ORCA_SLICER_PROFILE_ID=bambu-p2s-0.4-tpu-220c
ORCA_PRINTER_ID=bambu-p2s
ORCA_MATERIAL_ID=tpu
ORCA_NOZZLE_TEMP_C=220
ORCA_BED_TEMP_C=35
```

Perfil considerado para este fluxo:

- impressora: Bambu Lab P2S;
- material: TPU;
- bico: 0.4 mm, salvo ajuste explicito no perfil do Orca;
- temperatura do bico: usar o valor do perfil real do Orca; 220 C e apenas fallback quando nao houver perfil pronto;
- mesa: 35 C como ponto inicial, ajustavel conforme adesao real;
- identificador do perfil: `bambu-p2s-0.4-tpu`.

Quando houver arquivos de perfil exportados do Orca, informe-os por:

```text
ORCA_SLICER_LOAD_SETTINGS=C:\caminho\maquina-p2s.json;C:\caminho\perfil-processo.json
ORCA_SLICER_LOAD_FILAMENTS=C:\caminho\filamento-tpu-220c.json
```

Tambem e possivel passar flags adicionais suportadas pelo Orca:

```text
ORCA_SLICER_EXTRA_ARGS=--alguma-flag valor
```

CSV gerado pelo script:

```text
Produtos\datasets\orca_tpu_p2s_220c_dataset.csv
```

Campos principais:

- `sample_id`
- `model_file`
- `gcode_file`
- `material_grams`
- `print_minutes`
- `filament_mm`
- `orca_version`
- `profile_id`
- `printer_id`
- `material_id`
- `nozzle_temp_c`
- `bed_temp_c`
- `sliced_at`
- `parser`

Antes de usar os dados no site, revise amostras com `material_grams` ou `print_minutes` zerados. Isso indica que o Orca gerou um G-code em formato nao reconhecido pelo parser ou que o fatiamento falhou sem erro explicito.

## Limitacoes atuais

O fluxo automatico consegue extrair solidos das saidas dos componentes, mas nao entende sozinho qual geometria representa a peca final quando a definicao contem volumes auxiliares.

Antes de usar os dados como base comercial, valide:

- se o `.3mf` exportado contem apenas a peca final;
- se a unidade do modelo esta em milimetros;
- se a orientacao e a escala estao corretas;
- se os parametros usados no Grasshopper correspondem aos parametros do configurador;
- se o fatiamento usa o perfil real de TPU e impressora.

## Geracao do arquivo usado pelo site

Depois da exportacao Grasshopper e do fatiamento Orca, gere novamente a base versionada:

```powershell
npm run build:sliced-data
```

Esse comando cruza:

```text
Produtos/datasets/grasshopper_3mf_variations.csv
Produtos/datasets/orca_tpu_p2s_220c_dataset.csv
```

E atualiza:

```text
lib/sliced-pricing-data.js
```

O arquivo gerado inclui:

- `sliderValues`, com nomes normalizados para os inputs do site quando possivel;
- `materialGrams` e `printMinutes`, usados diretamente pela precificacao;
- `bbox`, apenas como metadado de busca/proximidade;
- `siteCategorySlug`, `siteFormatSlug` e `hasNeck`, inferidos pela familia exportada.

Observacao operacional: se o Orca CLI retornar `process not compatible with printer`, revise o par de perfis machine/processo carregado em `ORCA_SLICER_LOAD_SETTINGS`. O script de fatiamento registra a falha por amostra e rejeita linhas sem `gcode_file`, `material_grams` ou `print_minutes`.
