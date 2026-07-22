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

O limite operacional e de 5 mm de vao interno (`menor tamanho externo - 2 × parede`). Ele e uma margem de seguranca do contrato CAD: todas as geometrias historicas incompletas ocorreram com vao de ate 4 mm. A altura completa, isoladamente, nao torna vendavel uma combinacao com abertura interna menor que esse limite.

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
- `pricing:check` percorre todos os valores de todos os sliders das superficies publicas com o mesmo motor usado pela loja. Alem do contexto padrao, cobre os extremos dos demais parametros e as espessuras de parede 0,8/2/4/6/8 mm (324 varreduras no catalogo atual).
- `pricing:audit` confere sincronismo do CSV, precos publicados, configuracoes padrao e duas medidas de cobertura: leave-one-out IDW-8 e validacao cruzada em cinco folds do modelo usado no site. Os limites seguem a referencia operacional: mediana de erro de ate 8% e no maximo 10% das amostras acima de 25% de erro por superficie.

O site ajusta, para cada superficie, um polinomio de grau 3 com coeficientes nao negativos sobre as dimensoes normalizadas. Essa restricao torna o custo nao decrescente quando largura, altura ou diametro aumentam. A parede do tubo e o diametro de um furo usam bases lineares separadas porque seus efeitos geometricos podem variar nas duas direcoes. O ajuste e gerado por `pricing:build-data` a partir dos slices reais e nunca deve ser editado manualmente.

As premissas de material, perda, maquina, energia, manutencao e desgaste vivem em `lib/pricing-cost.js`; site, gerador do CSV e auditorias importam a mesma funcao para impedir divergencia silenciosa de formula.

O texto publico "a partir de" significa o menor preco de uma configuracao fabricavel e vendavel. Nos tubos, a auditoria percorre todo o range de parede e ajusta os tamanhos minimos para preservar o vao interno exigido; nas demais familias, usa as menores dimensoes ativas de cada variante.

## Novas familias e fixacao por parafuso

O Pino inserido, a Sapata U e as variantes com furo para parafuso das sapatas lisas redonda e quadrada estao ativos depois da exportacao, do slice e da cobertura de preco validados. Os contratos sao:

| Familia | Script | Parametros do catalogo | Variantes |
| --- | --- | --- | --- |
| Sapata U | `Sapata_U_SemHaste.gh` / `Sapata_U_ComHaste.gh` | `diametro`, `espessura`, `comprimento`, `pescoco` | `sem-haste` / `haste` |
| Sapata com pino inserido | `Sapata_PinoInserido.gh` | `diametro`, `alturaBase` | unica |
| Sapata lisa redonda com furo | `Sapata_Lisa_Redonda-com parafuso.gh` | `diametro`, `alturaBase`, `diametroParafuso` | `com-parafuso` |
| Sapata lisa quadrada com furo | `Sapata_Lisa_Quadrada-com parafuso.gh` | `tamanhoBaseX`, `tamanhoBaseY`, `alturaBase`, `diametroParafuso` | `com-parafuso` |

As variantes `com-parafuso` entregam somente o furo de fixacao; o parafuso metalico nao esta incluido. O exportador limita o furo a 2--8 mm, a altura da base a pelo menos 2 mm e preserva 3 mm de parede radial. Foram aprovados 577 slices da variante quadrada e 356 da redonda.

O defeito original dos dois arquivos da Sapata U era o Panel `6ab4986f-3863-4ae8-beb1-6d30cc676b36`, que convertia em texto as cinco fontes de pontos antes da entrada `Vertices` do Nurbs. `repair-sapata-u-gh-archive.py` troca apenas a classe serializada desse objeto por um parametro `Point`, preserva GUIDs e conexoes e renomeia a saida final para `EXPORT_3MF` (`SDiff` sem haste e `SUnion` com haste). Os candidatos foram validados isoladamente antes da promocao. O lote aprovado contem 1.225 slices sem haste e 1.226 com haste.

Use o Orca Slicer 2.3.1 portatil usado pelo dataset canonico. A instalacao mais nova encontrada em `Program Files` apresentou `APPCRASH` em `OrcaSlicer.dll`; misturar versoes invalida a comparabilidade e pode perder o lote. Para preservar linhas ja validadas ao acrescentar um produto, use `ORCA_SLICE_ONLY_MISSING=true`.

As entradas explicitas dessas familias vivem em `PRODUCT_CONFIGS`, com `source_gh`, `slider_order`, ranges, defaults, variantes e selecao da saida final. Nao deixe os sliders sem nome serem interpretados como amostragem generica: isso pode produzir dados sem correspondencia com o configurador.

Use `GH_APPEND_DATASET=true` para preservar o CSV atual e filtre o arquivo com `GH_ONLY`. A exportacao deve ocorrer no repositorio escolhido por `TRACO_BASE_REPO`; sem essa variavel, o runner PowerShell usa o repositorio padrao da Area de Trabalho. Para um teste de Orca isolado, use um diretorio novo de saida e nao execute `slice:dataset` no CSV canonico: esse runner regrava o arquivo informado em `ORCA_DATASET_PATH`.

O gate para promover uma variante de `draft` e: geometria exportada valida, slice com `material_grams` e `print_minutes`, `pricing:build-data`, `pricing:check` e `pricing:audit` aprovados. Os limites de cobertura continuam mediana de erro de ate 8% e no maximo 10% de amostras acima de 25% de erro.
