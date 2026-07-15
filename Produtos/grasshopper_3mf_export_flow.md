# Fluxo Canonico De Slice

Este fluxo recomeca a base de dados de precificacao a partir de uma unica tabela:

```text
Produtos\datasets\slicer_pricing_dataset.csv
```

Essa tabela deve conter, na mesma linha:

- origem Grasshopper e identificadores do produto;
- parametros reais do configurador, como `tamanhoBaseX`, `tamanhoBaseY`, `alturaBase`, `alturaPescoco`, `paredeTubo` e `diametroPescoco`;
- arquivos exportados (`model_file`, `stl_file`, `gcode_file`);
- resultado do Orca (`material_grams`, `print_minutes`);
- custo de producao calculado a partir de material e tempo (`production_cost_brl` e detalhamento).

O CSV bruto antigo do Orca nao deve ser usado como base de preco, porque ele nao tem os parametros das pecas.

## Comandos

Gerar modelos e linhas do dataset a partir do Grasshopper:

```powershell
npm run export:gh
```

Fatiar os modelos apontados no proprio dataset e preencher a mesma tabela:

```powershell
npm run slice:dataset
```

Calcular custo de producao na mesma tabela:

```powershell
npm run cost:build
```

Gerar o modulo estatico usado pelo configurador publico:

```powershell
npm run pricing:build-data
```

Validar estrutura basica do dataset:

```powershell
npm run slice:check
```

## Saidas

O exportador Grasshopper grava:

```text
Produtos\3MF\*.3mf
Produtos\STL\*.stl
Produtos\datasets\slicer_pricing_dataset.csv
Produtos\logs\slicer_pricing_dataset.log
```

O fatiamento Orca grava G-code em:

```text
Produtos\slicer-output\
```

E atualiza no mesmo CSV:

```text
gcode_file
material_grams
print_minutes
filament_mm
orca_version
profile_id
printer_id
material_id
slice_status
slice_error
```

O calculo de custo grava, tambem no mesmo CSV:

```text
material_with_waste_grams
print_hours
material_cost_brl
energy_kwh
energy_cost_brl
maintenance_cost_brl
printer_wear_cost_brl
machine_cost_brl
production_cost_brl
cost_assumption_tpu_brl_kg
cost_assumption_energy_brl_kwh
cost_assumption_power_w
```

## Parametros De Produto

Os nomes de parametro devem bater com `lib/configurator-data.js`.

Parametros canonicos atuais:

```text
diametro
diametroBase
tamanhoBaseX
tamanhoBaseY
alturaBase
alturaPescoco
diametroPescoco
paredeTubo
pescoco
```

Exemplo para base quadrada:

```text
source_gh,sample_id,category_slug,format_slug,tamanhoBaseX,tamanhoBaseY,alturaBase,alturaPescoco,paredeTubo,model_file,stl_file,material_grams,print_minutes
Produtos/Scripts-GH/Sapata_Interna_Tubo-Quadrado.gh,Sapata_Interna_Tubo-Quadrado__v01,ponteira-interna-tubo,quadrado,30,30,6,20,1.5,Produtos/3MF/Sapata_Interna_Tubo-Quadrado__v01.3mf,Produtos/STL/Sapata_Interna_Tubo-Quadrado__v01.stl,,
```

## Grasshopper

O script operacional fica em:

```text
Produtos\scripts\gh_export_variations.py
```

Ele abre os `.gh` em `Produtos\Scripts-GH\`, aplica amostras dentro dos limites publicos do configurador e grava as linhas do CSV canonico. A configuracao dos produtos fica dentro do proprio script para evitar arquivos auxiliares soltos.

Para produtos tubulares, o plano tambem aplica as restricoes cruzadas de fabricacao declaradas em `manufacturing.tube_inner_span`. Uma amostra e descartada quando a parede consome o vao interno minimo ou quando a caixa da geometria exportada nao contem a altura esperada de base e pescoco.

Para completar lacunas pontuais sem refazer todo o lote, registre os pontos em `sampling.required_samples` e execute em modo direcionado:

```powershell
$env:GH_APPEND_DATASET="true"
$env:GH_TARGETED_SAMPLES_ONLY="true"
npm run export:gh
```

O modo direcionado exporta somente assinaturas requeridas que ainda nao existem no dataset.

Padrao recomendado para os arquivos `.gh`:

- expor a geometria final em uma saida chamada `EXPORT_3MF`;
- nomear sliders com os mesmos nomes do configurador sempre que possivel;
- quando os sliders estiverem genericos, manter a ordem esperada no script;
- evitar outputs publicos com geometrias intermediarias.

## Orca

O script operacional fica em:

```text
Produtos\scripts\orca-slice-dataset.mjs
```

Ele nao varre mais diretorios para criar uma tabela separada. Ele le `Produtos\datasets\slicer_pricing_dataset.csv`, usa `stl_file` ou `model_file` de cada linha e preenche o resultado do slicer na propria linha.

Variaveis principais:

```text
ORCA_SLICER_PATH=Produtos/tools/OrcaSlicer_Windows_V2.3.1_portable/orca-slicer.exe
ORCA_SLICER_OUTPUT_DIR=Produtos/slicer-output-current
ORCA_DATASET_PATH=Produtos/datasets/slicer_pricing_dataset.csv
ORCA_SLICER_PROFILE_ID=p2s-0.4-tpu-220c-layer-0.2-infill-8-walls-2-shells-3
ORCA_PRINTER_ID=bambu-p2s
ORCA_MATERIAL_ID=tpu
ORCA_NOZZLE_TEMP_C=220
ORCA_BED_TEMP_C=35
```

O script usa esses perfis e o Orca portatil do repositorio por padrao. Evite trocar para o Orca instalado em
`C:\Program Files\OrcaSlicer\orca-slicer.exe` sem refazer um teste isolado, porque essa instalacao falhou ao carregar
os perfis do lote.

Para fatiar apenas linhas ainda nao preenchidas:

```powershell
$env:ORCA_SLICE_ONLY_MISSING="true"
npm run slice:dataset
```

## Relacao Com O Site

Enquanto a base canonica nao estiver populada e conectada ao motor publico, o configurador nao deve voltar a estimar preco por volume geometrico. Configuracoes sem cobertura de slice ou fora das restricoes de fabricacao ficam sem preco e nao entram no carrinho.

O custo comercial definitivo deve usar somente:

```text
material_grams
print_minutes
```

vindos do Orca e preservados junto dos parametros reais do produto no CSV canonico.

O site publico consome a versao gerada em:

```text
lib/slicer-pricing-data.js
```

Premissas atuais do custo direto:

```text
TPU: R$ 170/kg
Energia SP efetiva: R$ 0,95/kWh
Bambu Lab P2S: 200 W medios durante impressao
Perda operacional: 5%
```

## Validacao da precificacao

Depois de gerar ou alterar modelos, reconstrua a versao consumida pelo site e rode as tres camadas de verificacao:

```powershell
npm run pricing:build-data
npm run pricing:model-check
npm run pricing:check
npm run pricing:audit
```

- `pricing:model-check` detecta parametros impossiveis e geometrias incompletas no CSV canonico; use `node Produtos/scripts/audit-pricing-models.mjs --fix` somente para classificar mecanicamente linhas ja invalidas.
- `pricing:check` percorre todos os valores de todos os sliders das superficies publicas com o mesmo motor usado pela loja.
- `pricing:audit` confere sincronismo do CSV, precos publicados, configuracoes padrao e cobertura leave-one-out IDW-8. Os limites de cobertura seguem a referencia operacional: mediana de erro de ate 8% e no maximo 10% das amostras acima de 25% de erro por superficie.
