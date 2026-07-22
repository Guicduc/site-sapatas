# Registry canônico de produtos

Fonte única de verdade para os produtos do catálogo. Cada produto é um JSON em
`catalog/products/<productId>.json`, validado contra `catalog/product.schema.json`.
As categorias (e suas rotas `/configurar/{slug}`) vivem em `catalog/categories.json`.

## Como criar um produto novo

1. Copie um manifesto existente da mesma categoria e ajuste `productId`, nome,
   parâmetros, variantes e composição de SKU. O produto nasce com `"status": "draft"`.
2. O script Grasshopper referenciado em cada variante (`variants[].cad.script`)
   precisa existir — ele é a capacidade de produção. STL/GLB pré-gerado por medida
   **não** é requisito; a peça específica continua sendo gerada manualmente no admin
   (`generationMode: "local_manual"`).
3. Gere os dados de slice das variantes públicas (`npm run export:gh` + fluxo de
   dataset). O gate para ativar é a superfície de preço, não o CAD.
4. Rode `npm run product:check` (ou `npm run product:check -- <productId>`).
   O check falha se um produto `active` tiver variante pública sem amostras de slice.
5. Quando todas as variantes públicas tiverem dados de slice válidos, mude para
   `"status": "active"`.

Fluxo resumido: **draft → slice validado → active**.

## O que o `product:check` valida

- Estrutura obrigatória de cada manifesto (subset do schema).
- Unicidade de `productId`, `seo.familySlug`, `skuPrefix` e rota (categoria+formato).
- Parâmetros: chaves únicas, `min ≤ default ≤ max`, `dependsOn` aponta para toggle real.
- SKU: todo parâmetro numérico tem código curto e posição em `parameterOrder`.
- CAD: script `.gh` existe; `sliderOrder`/`sliderTransforms` só referenciam
  parâmetros do produto.
- Preço: `surfaceId` segue `categoria:formato:variante`; variante pública de produto
  `active` precisa de amostras no dataset canônico de slice.
- Paridade com o catálogo legado (`lib/configurator-data.js`): enquanto os
  consumidores não migram para o registry, ranges, defaults, steps, prefixo de SKU e
  prazo precisam bater — qualquer divergência quebra o check.

## Variantes

`sem-haste`, `haste` e `com-parafuso` são os mesmos IDs em UI, CAD, dataset, imagens
e auditoria. Nas sapatas lisas redonda e quadrada, `com-parafuso` é público e usa o
toggle `parafuso` com `diametroParafuso` de 2 a 8 mm. A variante representa a sapata
com furo de fixação; o parafuso metálico não acompanha a peça. Os toggles `pescoco`
e `parafuso` são mutuamente exclusivos e resolvem a variante declarada em
`variants[].condition`.
