# Cruzamento: concorrente x custo dos sliders

Data: 2026-05-26

Objetivo: comparar precos de concorrentes extraidos das imagens com o custo/preco gerado pelo configurador parametrico, para orientar a logica real de precificacao.

## Premissas usadas

- Base concorrente: `docs/catalog/base-concorrentes-sapatas.csv`.
- Motor atual: `calculatePriceBreakdown` em `lib/configurator-data.js`.
- Markup atual do site: `55%` sobre custo direto, com taxa de canal de `6%`.
- Energia realista da conversa anterior: Bambu Lab P2S em torno de `200 W`, resultando em cerca de `R$ 0,13/h` em Sao Paulo. O site ainda usa `R$ 0,07/h`, entao ha um pequeno ajuste pendente.
- Para pecas sem altura explicita, foi usada a altura default do slider da familia correspondente.
- Precos concorrentes sao de pecas injetadas/usadas como referencia de mercado, nao de produto sob medida em TPU. Por isso, o cruzamento serve para calibrar posicionamento, nao para copiar preco.

## Amostra comparavel

| Concorrente | Nossa familia | Preco concorrente | Custo nosso estimado | Preco atual slider | Markup implicito pelo mercado | Leitura |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| ESSENTRA BFSA010A - sapata com haste Ø10.31x7.54 | sapata lisa redonda | R$ 2,23 | R$ 0,21 | R$ 0,35 | 898% | Ha espaco claro para markup alto em peca pequena. |
| ESSENTRA BFSA015A - sapata com haste Ø12.7x15.09 | sapata lisa redonda | R$ 3,38 | R$ 0,40 | R$ 0,67 | 694% | Mesmo padrao: preco atual esta muito baixo frente ao mercado. |
| ESSENTRA SIG 1353C - ponteira/sapata quadrada 2" | sapata lisa quadrada | R$ 3,87 | R$ 2,42 | R$ 3,99 | 50% | Markup atual esta coerente para peca media. |
| ESSENTRA RDR081012A - ponteira redonda 7/8" | sapata tubo redondo | R$ 2,19 | R$ 1,52 | R$ 2,50 | 35% | Markup atual fica um pouco acima do concorrente. |
| ESSENTRA RDR111056A - ponteira redonda 3/4" | sapata tubo redondo | R$ 1,68 | R$ 1,16 | R$ 1,91 | 36% | Similar: preco atual ligeiramente acima. |
| ESSENTRA SQR111205A - ponteira quadrada 50x50 | sapata tubo quadrado | R$ 4,68 | R$ 5,88 | R$ 9,70 | negativo | Nao competir como commodity; so vender se for sob medida/diferenciada. |
| ESSENTRA RDR111057A - ponteira quadrada 18x18 | sapata tubo quadrado | R$ 0,37 | R$ 1,07 | R$ 1,76 | negativo | Commodity injetado inviabiliza competicao direta. |
| ESSENTRA SQR111218A - ponteira quadrada 25.4x25.4 | sapata tubo quadrado | R$ 0,63 | R$ 1,85 | R$ 3,04 | negativo | Mesmo caso: vender apenas por medida especial, lote pequeno ou ajuste real. |

## Simulacao apos politica aplicada

Politica aplicada no site:

- custo direto = material + energia por tempo de impressao;
- custo de maquina, depreciacao e manutencao removidos do custo direto;
- energia por hora = `R$ 0,1312/h`;
- quando ha referencia do Orca/Slicer, a precificacao usa diretamente `materialGrams` e `printMinutes`;
- inputs fatiados atuais sao provisorios e podem ser substituidos por novos exports sem mudar a regra comercial;
- ponteiras internas de tubo usam `real_cost_plus_cover`, com margem menor para nao fugir demais de item injetado comum;
- sapatas lisas usam margem regressiva maior, porque o mercado aceita melhor valor por peca pequena/customizavel.

| Concorrente | Nossa familia | Preco concorrente | Custo novo | Preco novo | Margem aplicada | Relacao vs concorrente | Input usado |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| RDR081012A redondo 7/8" | sapata tubo redondo | R$ 2,19 | R$ 0,87 | R$ 1,58 | 41% | 0,72x | estimado ate exportar slice redondo |
| RDR111056A redondo 3/4" | sapata tubo redondo | R$ 1,68 | R$ 0,66 | R$ 1,27 | 45% | 0,76x | estimado ate exportar slice redondo |
| RDR111049A redondo 2" | sapata tubo redondo | R$ 1,14 | R$ 3,86 | R$ 5,72 | 28% | 5,02x | estimado ate exportar slice redondo |
| SQR111205A quadrado 50x50 | sapata tubo quadrado | R$ 4,68 | R$ 2,12 | R$ 3,34 | 33% | 0,71x | 10,7 g / 48,5 min; input provisorio |
| BFSA010A haste Ø10.31x7.54 | sapata lisa redonda | R$ 2,23 | R$ 0,09 | R$ 1,90 | 86% | 0,85x | 0,4 g / 3,1 min; input provisorio |
| BFSA015A haste Ø12.7x15.09 | sapata lisa redonda | R$ 3,38 | R$ 0,12 | R$ 1,90 | 86% | 0,56x | 0,6 g / 3,7 min; input provisorio |
| SIG 1353C quadrada 2" | sapata lisa quadrada | R$ 3,87 | R$ 1,13 | R$ 4,09 | 71% | 1,06x | 5,7 g / 25,5 min; input provisorio |
| RDR111057A quadrado 18x18 | sapata tubo quadrado | R$ 0,37 | R$ 0,40 | R$ 0,86 | 50% | 2,32x | 2,0 g / 11,4 min; input provisorio |
| RDR11035A quadrado 16x16 | sapata tubo quadrado | R$ 0,84 | R$ 0,33 | R$ 0,73 | 52% | 0,87x | 1,6 g / 10,3 min; input provisorio |
| SQR111218A quadrado 25.4x25.4 | sapata tubo quadrado | R$ 0,63 | R$ 0,83 | R$ 1,52 | 42% | 2,41x | 4,2 g / 19,7 min; input provisorio |

Exemplo do caso critico:

```text
Quadrado 25.4x25.4
Concorrente injetado: R$ 0,63
Nosso custo real: R$ 0,83
Mesmo sem margem, ja ficamos acima do concorrente commodity de baixo preco.
Com capa comercial, o preco vai a R$ 1,52.
Conclusao: vender apenas quando houver customizacao, reposicao, tolerancia ou lote pequeno.
```

Exemplo do caso favoravel:

```text
Sapata com haste Ø10.31x7.54
Concorrente: R$ 2,23
Nosso custo real: R$ 0,09
Preco com piso/margem: R$ 1,90
Conclusao: existe espaco para margem alta sem ficar fora do mercado.
```

Exemplo do input a revisar:

```text
Quadrado 50x50
Dataset atual: 10,7 g / 48,5 min
Slice novo citado manualmente: perto de 16 g
Com 16 g, o custo e o preco sobem automaticamente pela mesma politica.
Conclusao: atualizar o dataset fatiado antes de usar esse preco como referencia final.
```

## Diagnostico

O markup fixo de `55%` esta errado para as pontas da curva:

- Para pecas muito pequenas de base lisa, o custo direto fica tao baixo que o preco sugerido vira artificialmente barato. Exemplo: custo de R$ 0,21 a R$ 0,40 gerando preco de R$ 0,35 a R$ 0,67, enquanto o mercado aceita R$ 2,23 a R$ 3,38.
- Para pecas maiores ou ponteiras internas que competem com injetado barato, o custo de TPU/impressao cresce e o markup fixo joga o preco para fora do mercado.
- Em algumas ponteiras quadradas pequenas, nem markup zero resolve contra o concorrente. A decisao correta nao e reduzir margem; e marcar como `nao competir commodity` e vender apenas quando houver diferencial: medida real, tolerancia, lote pequeno, cor, piso sensivel, encaixe especial ou reposicao fora de padrao.

## Plano de precificacao

### 1. Separar custo real de preco comercial

Manter o motor calculando custo direto com:

- material;
- perda;
- energia;
- desgaste/manutencao da maquina;
- tempo de impressao;
- taxa de canal.

Adicionar dois custos que hoje estao subestimados ou ausentes:

- `handlingCostPerOrderBrl`: custo fixo de separacao, embalagem, etiqueta, atendimento e checkout;
- `setupCostPerBatchBrl`: custo de preparar impressao, validar arquivo e primeira peca, diluido por quantidade.

Isso evita vender peca pequena por centavos quando a operacao real custa mais que o material.

### 2. Usar margem regressiva por custo unitario

Trocar markup fixo por curva. A curva deve mirar margem alta em custo baixo e margem menor em custo alto.

Proposta inicial:

| Custo direto unitario | Margem alvo antes da taxa | Markup equivalente |
| ---: | ---: | ---: |
| ate R$ 0,50 | 80% a 85% | 400% a 567% |
| R$ 0,51 a R$ 1,50 | 70% a 80% | 233% a 400% |
| R$ 1,51 a R$ 4,00 | 55% a 70% | 122% a 233% |
| R$ 4,01 a R$ 10,00 | 45% a 55% | 82% a 122% |
| acima de R$ 10,00 | 35% a 45% | 54% a 82% |

Formula recomendada para implementar sem degraus bruscos:

```text
margin = interpolateLog(cost, [
  [0.30, 0.85],
  [1.00, 0.75],
  [4.00, 0.55],
  [10.00, 0.45],
  [25.00, 0.35]
])

price_before_fee = cost / (1 - margin)
price = price_before_fee / (1 - channel_fee)
```

### 3. Aplicar piso comercial por unidade e por pedido

Para pecas pequenas, o piso e mais importante que o markup.

Proposta:

- `minUnitPriceBrl`: R$ 1,90 para item unitario publico;
- `minOrderSubtotalBrl`: R$ 24,90 ou venda por kit quando a unidade ficaria baixa;
- `kitQuantitySuggestion`: sugerir kit de 4, 8, 16 ou 50 conforme familia.

Isso permite uma sapata de custo R$ 0,30 custar R$ 1,90 a R$ 2,50 sem depender de markup absurdo na tela. Comercialmente, o cliente compra um kit, nao uma unidade isolada de centavos.

### 4. Usar ancoragem de mercado quando houver comparativo

Criar uma tabela de referencias por familia/medida:

```text
market_reference_price_brl
market_reference_confidence
comparison_status
commodity_risk
positioning_factor
```

Regra:

- Se `commodity_risk = alto` e nosso custo ja passa de 70% do preco concorrente, nao tentar competir por preco. Mostrar como sob medida/premium ou exigir pedido especial.
- Se `commodity_risk = baixo` ou `comparavel_parcial`, usar preco de mercado como piso/ancora.
- Para produto sob medida com diferencial, mirar `1.2x` a `2.0x` o item comum quando o custo permitir.

Formula pratica:

```text
curve_price = price_from_regressive_margin(cost)
market_floor = competitor_price * positioning_factor

if commodity_risk_high and cost > competitor_price * 0.70:
  status = "sob_medida_nao_commodity"
  price = max(curve_price, minimum_custom_price)
else:
  price = max(curve_price, market_floor, min_unit_price)
```

### 5. Classificar familias por estrategia

| Familia | Estrategia |
| --- | --- |
| sapata lisa redonda | Precificar por valor/mercado; aceita markup alto em tamanhos pequenos. |
| sapata lisa quadrada | Curva regressiva normal; mercado parece proximo do preco atual em peca media. |
| sapata tubo redondo | Hibrido: commodity nas medidas padrao; cobrar mais quando for medida real/sob medida. |
| sapata tubo quadrado | Alto risco commodity; evitar brigar com injetado em 16x16, 18x18, 25x25. |
| tubo oblongo/especial | Precificacao premium, porque a comparabilidade e menor. |

### 6. Implementar em etapas

1. Criar `lib/pricing-policy.js` com a curva de margem regressiva, pisos comerciais e funcao de ancoragem de mercado.
2. Adicionar campos de referencia de mercado ao CSV/banco: dimensoes normalizadas, risco commodity, preco concorrente normalizado e fator de posicionamento.
3. Alterar `calculatePriceBreakdown` para retornar `directCostBrl`, `curvePriceBrl`, `marketAdjustedPriceBrl`, `finalPriceBrl` e `pricingDecision`.
4. No configurador, exibir apenas o preco final, mas manter a decisao no admin para auditoria.
5. Rodar uma matriz de simulacao por familia e dimensao: 10, 12, 14, 16, 18, 20, 25, 30, 40, 50, 75 e 100 mm.
6. Revisar manualmente os outliers: qualquer item com preco final abaixo de R$ 1,90 ou acima de 2x o concorrente commodity precisa de justificativa.

## Recomendacao inicial

Nao usar apenas markup regressivo. Usar uma politica composta:

```text
preco final =
  max(
    preco por margem regressiva,
    piso comercial por unidade/kit,
    ancora de mercado quando aplicavel
  )
```

Com uma excecao importante:

```text
se for commodity injetada e nosso custo estiver alto demais,
nao forcar preco competitivo; marcar como sob medida/premium.
```

Essa regra protege margem nas pecas pequenas, evita inviabilizar pecas grandes e impede que o catalogo tente competir diretamente com item injetado barato onde a impressao 3D nao tem vantagem economica.
