# Fluxo de exportacao 3MF a partir do Grasshopper

Este documento descreve o fluxo que foi usado para abrir definicoes Grasshopper (`.gh`), extrair as geometrias geradas, exportar arquivos `.3mf` e montar a primeira tabela de dados para analise de custo.

## Arquivos usados

Definicoes Grasshopper de origem:

- `C:\Users\Administrador\Desktop\sapata interno tubo.gh`
- `C:\Users\Administrador\Desktop\Sapata Interno tubo quadrado _oblongo.gh`
- `C:\Users\Administrador\Desktop\sapatas.gh`

Script principal:

- `C:\Users\Administrador\.codex\worktrees\23b5\Rhino\scripts\gh_export_dataset.py`

Saidas geradas:

- Pasta de exportacao: `C:\Users\Administrador\.codex\worktrees\23b5\Rhino\dataset_exports`
- Arquivos `.3mf`: um arquivo por solido detectado
- CSV de dados: `C:\Users\Administrador\.codex\worktrees\23b5\Rhino\dataset_exports\sapatas_dataset.csv`
- Log: `C:\Users\Administrador\.codex\worktrees\23b5\Rhino\dataset_exports\gh_export_dataset.log`

## Correcao aplicada antes da exportacao

O Grasshopper abria com erros de carregamento de objetos `MillC_*`, relacionados ao plugin Millipede.

Arquivos desativados:

- `C:\Users\Administrador\AppData\Roaming\Grasshopper\Libraries\millipede.gha`
- `C:\Users\Administrador\AppData\Roaming\Grasshopper\Libraries\MillipedeShared.dll`

Eles foram movidos para:

```text
C:\Users\Administrador\AppData\Roaming\Grasshopper\Libraries\_Disabled_Millipede_2026-05-22
```

Essa alteracao e reversivel: basta mover os arquivos de volta para `Libraries`.

## Como o Rhino/Grasshopper foi acionado

O Rhino 7 foi automatizado via COM a partir do PowerShell, porque a execucao direta por `/runscript` nao disparou corretamente nesta instalacao.

Fluxo de execucao usado:

```powershell
$rhino = New-Object -ComObject Rhino.Application
$rhino.Visible = $true
Start-Sleep -Seconds 3
$rhino.RunScript('-_RunPythonScript ("C:\Users\Administrador\.codex\worktrees\23b5\Rhino\scripts\gh_export_dataset.py")', 0)
```

Dentro do Rhino, o script Python usa RhinoCommon e carrega o assembly do Grasshopper:

```python
clr.AddReferenceToFileAndPath(
    r"C:\Program Files\Rhino 7\Plug-ins\Grasshopper\Grasshopper.dll"
)
import Grasshopper
```

## Fluxo geral do script

1. Define a lista de arquivos `.gh` em `GH_FILES`.
2. Define a pasta de saida em `OUT_DIR`.
3. Carrega o Grasshopper via `load_grasshopper()`.
4. Para cada arquivo `.gh`:
   - limpa objetos existentes no documento Rhino;
   - abre o documento Grasshopper com `GH_DocumentIO`;
   - resolve a definicao com `ghdoc.NewSolution(True)`;
   - percorre as saidas dos componentes;
   - extrai geometrias RhinoCommon validas;
   - filtra apenas solidos exportaveis;
   - adiciona os solidos ao documento Rhino;
   - exporta cada solido individualmente para `.3mf`;
   - calcula volume, area e bounding box;
   - grava uma linha no CSV.

## Funcoes principais usadas

### `load_grasshopper()`

Carrega o assembly do Grasshopper dentro da sessao Rhino Python.

Responsabilidade:

- disponibilizar o namespace `Grasshopper`;
- permitir abrir arquivos `.gh` programaticamente.

### `bake_document(gh, gh_path)`

Abre e resolve uma definicao Grasshopper.

Responsabilidade:

- abrir o arquivo `.gh` com `GH_DocumentIO`;
- chamar `ghdoc.NewSolution(True)` para calcular a definicao;
- percorrer os objetos do documento Grasshopper;
- procurar dados nas saidas dos componentes (`Params.Output`);
- converter esses dados para geometria RhinoCommon;
- adicionar os solidos encontrados ao documento Rhino;
- retornar os `Guid`s dos objetos adicionados.

Observacao: o script tambem tenta usar `BakeGeometry()` quando o componente oferece esse metodo, mas a parte mais importante foi a leitura direta de `VolatileData`, porque muitos componentes nativos nao fazem bake direto pelo metodo padrao.

### `geometry_from_goo(goo)`

Converte dados Grasshopper para geometria RhinoCommon.

Responsabilidade:

- tentar ler `goo.Value`;
- se necessario, tentar `goo.ScriptVariable()`;
- retornar uma copia da geometria quando ela for `Rhino.Geometry.GeometryBase`.

### `is_exportable_solid(geom)`

Filtra apenas geometrias que fazem sentido para exportacao 3D.

Tipos aceitos:

- `Brep` solido;
- `Mesh` fechado;
- `Extrusion` que vira `Brep` solido.

O filtro tambem verifica se `VolumeMassProperties.Compute()` consegue calcular volume.

### `geometry_key(geom)`

Cria uma chave simples para evitar duplicatas.

A chave usa:

- volume arredondado;
- minimo e maximo da bounding box nos eixos X, Y e Z.

Isso evita exportar o mesmo solido repetidas vezes quando ele aparece em mais de uma saida Grasshopper.

### `add_geometry(geom, attrs)`

Adiciona a geometria ao documento Rhino ativo.

Comportamento:

- `Brep` entra com `sc.doc.Objects.AddBrep`;
- `Mesh` entra com `sc.doc.Objects.AddMesh`;
- `Extrusion` e convertida para `Brep`.

O script fixa `sc.doc = Rhino.RhinoDoc.ActiveDoc` porque alguns componentes Grasshopper podem alterar o contexto do documento durante a solucao.

### `select_only(ids)`

Seleciona apenas os objetos que devem ser exportados.

Passos:

- fixa o documento Rhino ativo;
- roda `_SelNone`;
- seleciona os objetos pelos `Guid`s;
- redesenha a viewport.

### `export_3mf(path, ids)`

Exporta o objeto selecionado para `.3mf`.

Comando usado:

```python
command = '-_Export "{}" _Enter'.format(path)
Rhino.RhinoApp.RunScript(command, False)
```

Antes da exportacao, chama `select_only(ids)`, garantindo que cada `.3mf` contenha apenas o solido daquela linha.

### `object_metrics(rhino_object)`

Calcula os dados usados no CSV.

Campos extraidos:

- `object_id`
- `object_type`
- `area_model_units2`
- `volume_model_units3`
- `bbox_x`
- `bbox_y`
- `bbox_z`

As metricas usam:

- `Rhino.Geometry.AreaMassProperties.Compute(geom)`
- `Rhino.Geometry.VolumeMassProperties.Compute(geom)`
- `geom.GetBoundingBox(True)`

### `main()`

Orquestra o processo completo.

Responsabilidade:

- preparar a pasta de saida;
- abrir o log;
- carregar Grasshopper;
- processar cada arquivo `.gh`;
- exportar os `.3mf`;
- montar as linhas do dataset;
- salvar `sapatas_dataset.csv`;
- fechar o Rhino no final.

## Resultado da primeira rodada

Foram exportados 97 modelos:

| Arquivo Grasshopper | Modelos exportados |
|---|---:|
| `sapata interno tubo.gh` | 56 |
| `Sapata Interno tubo quadrado _oblongo.gh` | 30 |
| `sapatas.gh` | 11 |

## Limitacoes atuais

O script atual extrai solidos automaticamente das saidas dos componentes. Isso funcionou para gerar a primeira base, mas ainda nao identifica semanticamente qual solido e "a peca final" quando uma definicao contem geometrias intermediarias.

Para uma base de custo mais confiavel, o proximo passo e marcar explicitamente o output final de cada definicao Grasshopper, por exemplo:

- nomear um parametro final como `EXPORT_3MF`;
- usar um grupo padrao chamado `EXPORT`;
- ou adicionar um componente/painel que indique quais geometrias entram no dataset.

Tambem falta capturar os parametros de entrada usados em cada modelo, como largura, altura, parede, diametro, raio, quantidade de aletas e interferencia. Esses campos sao necessarios para previsao de custo por medida.

