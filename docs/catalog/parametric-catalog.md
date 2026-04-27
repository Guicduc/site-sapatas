# Catalogo Parametrico

## Principio

O catalogo nao deve ser uma colecao solta de modelos. A unidade principal e a `familia`, e cada familia governa um conjunto de parametros, ranges validos e arquivos tecnicos derivados.

O produto lancado deve ser a familia parametrizada, nao uma medida fixa. Medidas especificas podem existir como presets de validacao, exemplos comerciais, referencias de preco ou SKUs recorrentes, mas nao devem limitar o lancamento inicial.

Se a medida do cliente estiver dentro dos ranges tecnicos aprovados da familia, ela deve ser tratada como configuracao normal do produto. Se estiver fora dos ranges aprovados, vira `SpecialRequest`.

## Estrutura de produto

### Familia de produto

Campos obrigatorios:

- `slug`
- `nome`
- `proposta`
- `aplicacoes`
- `material_padrao`
- `cores_disponiveis`
- `parametros_permitidos`
- `regras_de_compatibilidade`
- `faixas_padrao`
- `faq`

### Variante

Cada variante representa uma configuracao validada e comercializavel de:

- base ou diametro
- altura
- fixacao ou encaixe
- faixa de compatibilidade
- cor
- material
- acabamento

Uma variante pode nascer de duas formas:

- `preset`: medida usada para validacao, exemplo comercial ou recompra frequente
- `sob_medida`: configuracao gerada sob demanda dentro dos ranges aprovados da familia

## Parametros minimos

- largura ou diametro da base
- altura
- tipo de fixacao ou encaixe
- espessura util ou faixa compativel de pe, chapa ou tubo
- cor
- material
- acabamento
- carga recomendada
- aplicacao

## Regras de governanca

- toda familia precisa declarar quais parametros sao configuraveis
- toda configuracao dentro dos ranges aprovados pode ser produzida sob medida
- toda configuracao fora dos ranges tecnicos aprovados vira `SpecialRequest`
- nem toda cor precisa estar disponivel em toda medida
- variantes descontinuadas nao devem ser apagadas; devem mudar de status
- presets nao devem ser confundidos com limite de catalogo

## Estrategia de SKU

Formato sugerido para familia/modelo:

```text
TB-{familia}-{fixacao}
```

Exemplos:

```text
TB-RT-PI
TB-BL-OB
TB-CH-U
TB-RD-AA
```

Quando uma configuracao recorrente precisar virar SKU fechado, adicionar parametros comerciais:

```text
TB-{familia}-{fixacao}-{preset}-{cor}
```

Exemplos:

```text
TB-RT-PI-3020-PRE
TB-BL-OB-5020-PRE
TB-CH-U-03-PRE
```

Convencoes:

- `RD`: tubo redondo
- `QD`: tubo quadrado
- `RT`: tubo retangular
- `BL`: base lisa
- `CH`: chapa
- `SL`: sapata plana deslizante
- `PI`: press-fit interno
- `PF`: press-fit
- `AD`: adesiva
- `OB`: oblonga
- `AA`: anti-arrancamento
- cores em sigla curta e estavel

## Fluxo Rhino + Grasshopper

### Fonte de verdade

Cada familia deve existir como definicao Grasshopper com:

- parametros nomeados de forma estavel
- ranges aprovados
- presets de validacao, precificacao e exemplos de catalogo
- saida de malha para exportacao STL

### Pipeline recomendado

1. modelar a geometria-mae no Rhino
2. expor no Grasshopper apenas os parametros comerciais relevantes
3. definir ranges tecnicos aprovados
4. gerar presets para validacao e exemplos de catalogo
5. exportar STLs com nomenclatura identica ao SKU ou pedido
6. registrar a configuracao com preco, lead time e status

### Pastas sugeridas fora do site

```text
cad/
  families/
    rt_pressfit_internal/
    bl_oblong/
    ch_u_clip/
    rd_anti_pullout/
exports/
  stl/
    aprovados/
```

## Validacao tecnica por familia

Antes de publicar uma familia:

- validar encaixe na faixa declarada
- validar deformacao e assentamento no piso
- validar desgaste estetico esperado
- validar tempo de impressao e custo real
- validar limites minimo e maximo dos parametros
- registrar quando a peca exige teste fisico antes de venda
