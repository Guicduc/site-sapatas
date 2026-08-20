# Lancamento de produto

Este e o ponto de entrada para criar ou alterar produtos. Os documentos especializados continuam sendo a fonte detalhada de cada etapa.

## Regra principal

Criar o produto como `draft`. Alterar para `active` somente depois de todos os gates tecnicos, comerciais e visuais passarem.

Fluxo:

```text
draft -> CAD -> amostras Grasshopper -> slice Orca -> preco -> imagens -> pagina e configurador -> validacao -> active
```

## 1. Definir o produto

1. Copiar um manifesto da mesma categoria em `catalog/products/`.
2. Definir identidade, rota, parametros, variantes, SKU, CAD e pricing.
3. Reutilizar um `drawingType` existente quando a geometria for equivalente.
4. Criar um adaptador somente quando o desenho ou as restricoes forem realmente novos.
5. Rodar `npm run product:check -- <productId>`.

Contrato de interface: `docs/catalog/configurator-contract.md`.

## 2. Preparar o CAD

1. Adicionar ou revisar o `.gh` em `Produtos/Scripts-GH/`.
2. Usar nomes de sliders iguais as chaves do manifesto sempre que possivel.
3. Declarar `variants[].cad.sliderOrder` e transformacoes no manifesto.
4. Confirmar que a saida final do Grasshopper esta identificada como `EXPORT_3MF`.

Detalhes: `docs/catalog/contracts.md`.

## 3. Gerar amostras e slice

Executar na ordem:

```powershell
npm run export:gh
npm run slice:dataset
npm run pricing:build-data
npm run pricing:model-check
npm run pricing:check
npm run pricing:audit
```

Em uma estação com Rhino e Orca configurados, `npm run product:prepare-data` executa as três primeiras etapas em sequência. O comando não deve rodar em CI nem no processo web.

O CSV canônico e `Produtos/datasets/slicer_pricing_dataset.csv`. Nao criar uma tabela separada do Orca nem usar volume geometrico como preco publico.

Detalhes: `Produtos/grasshopper_3mf_export_flow.md`.

## 4. Produzir imagens

1. Capturar referencias consistentes do Rhino quando necessario.
2. Gerar ou renderizar os papeis `family`, `product`, `manual` e `usage`.
3. Manter proporcao, linguagem visual, material e cores definidos em `DESIGN.md`.
4. Salvar em `public/products/final/` com nomes estaveis.
5. Registrar caminho e texto alternativo no manifesto.
6. Fazer revisao humana de geometria, montagem, escala e coerencia visual.

Imagens geradas nunca alteram o estado do produto automaticamente.

## 5. Validar pagina e configurador

1. Abrir a rota de configuracao declarada em `category.slug` e `formatSlug`.
2. Conferir desenho, campos, dependencias, cor, quantidade, preco e prazo.
3. Testar valores minimo, inicial e maximo.
4. Conferir desktop, mobile, teclado e mensagens de erro.
5. Adicionar ao carrinho e criar um pedido de demonstracao ou teste local.
6. Conferir SKU e dados para Grasshopper em `/admin/pedidos`.

## 6. Ativar

Executar:

```powershell
npm test
npm run product:check -- <productId>
npm run pricing:audit
npm run build
```

Para executar os gates locais em sequência, use `npm run product:validate`.

Somente depois:

1. Alterar `status` para `active`.
2. Repetir `npm run product:check` e `npm run build`.
3. Revisar o diff para confirmar que checkout, pagamento e frete nao foram alterados.

## Falhas e retomada

- Falha de CAD: manter `draft` e corrigir script, chaves ou transformacoes.
- Falha de slice: manter `draft` e revisar modelo, perfil ou dataset.
- Falha de preco: manter `draft`; nao adicionar fallback geometrico.
- Falha visual: manter `draft` e substituir apenas os artefatos reprovados.
- Falha de paridade: manter o consumidor legado ativo ate o registry produzir o mesmo contrato.
