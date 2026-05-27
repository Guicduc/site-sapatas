# Guia de navegacao para agentes

Este documento existe para orientar agentes de IA que precisam entender ou alterar o projeto sem depender de documentacao antiga.

## Estrutura principal

- `app/`: rotas do Next.js App Router, metadados e APIs.
- `components/`: componentes de UI, configurador, carrinho, catalogo e paineis administrativos.
- `lib/`: dados do site, regras de catalogo, precificacao, pedidos, pagamentos e integracoes.
- `public/brand/`: logos, imagens de categoria e imagens sociais.
- `Produtos/`: scripts Grasshopper e documentacao do fluxo de exportacao 3MF.
- `docs/`: documentacao atual do projeto.

As pastas `site/` e `pricing-lab/` foram removidas do versionamento nesta reorganizacao. Se aparecerem vazias no filesystem local, nao sao parte ativa do app.

## Rotas publicas

- `/` e `/catalogo`: renderizam o catalogo configuravel com `ProductCatalog`.
- `/configurar/[categoria]`: abre o configurador de uma categoria de produto.
- `/carrinho`: exibe itens salvos no carrinho local do navegador.
- `/pedido-confirmado`: mostra o resultado do pedido/pagamento.
- `/familias/[slug]`: paginas SEO de familias de produto.
- `/como-funciona`, `/processo`, `/projeto-especial`, `/faq`: paginas institucionais.
- `/robots.txt` e `/sitemap.xml`: gerados por `app/robots.js` e `app/sitemap.js`.

## APIs

- `POST /api/orders`: cria pedido a partir do carrinho usando `buildOrderDraft` e `createOrder`.
- `GET /api/orders/[id]`: consulta pedido.
- `POST /api/payments/mercado-pago/preference`: cria preferencia de pagamento para pedido pagavel.
- `POST /api/webhooks/mercado-pago`: recebe atualizacoes de pagamento do Mercado Pago.
- `GET /api/webhooks/mercado-pago`: health check simples do webhook.

## Dados de catalogo

O ponto principal e `lib/configurator-data.js`.

- `productCategories`: categorias exibidas no catalogo e no configurador.
- Cada categoria contem `slug`, `name`, imagem, aplicacoes, cores, acabamentos e `formats`.
- Cada `format` define `slug`, `skuPrefix`, `drawingType`, preco base, prazo base e `parameters`.
- Parametros numericos usam `min`, `max`, `defaultValue`, `unit` e `step`.
- Parametros condicionais usam `dependsOn`.
- Produtos ativos atuais usam cor `Preta` e, em geral, acabamento vazio ou `nao se aplica`.

Funcoes importantes:

- `getCategoryBySlug` e `getFormat`: resolvem categoria/formato por slug.
- `getInitialValues`: monta valores padrao do configurador.
- `validateConfiguration`: valida limites de medidas.
- `calculatePriceBreakdown`: calcula preco, custo e fonte da precificacao.
- `calculateLeadTime`: calcula prazo em dias uteis.
- `buildConfigurationSku`: monta SKU a partir do prefixo e medidas.

## Familias e conteudo do site

Use `lib/site-data.js` para conteudo editorial e SEO:

- `brand`: nome, descricao, contatos e localidade.
- `navigation`: links do header.
- `faqSections`: perguntas frequentes.
- `families`: paginas de familias em `/familias/[slug]`.

As familias atuais publicadas sao:

- `sapata-tubo-redondo`
- `sapata-tubo-quadrado`
- `sapata-tubo-oblongo`
- `sapata-lisa-redonda`
- `sapata-lisa-quadrada`

## Componentes centrais

- `components/product-catalog.jsx`: lista categorias e formatos.
- `components/product-configurator.jsx`: controla selecao de formato, medidas, cor, quantidade, preco e envio ao carrinho.
- `components/parametric-drawing.jsx`: desenho 2D interativo do produto configurado.
- `components/parametric-model-viewer.jsx`: visualizacao 3D com Three.js quando usada.
- `components/cart-provider.jsx`: estado do carrinho em `localStorage` com chave `traco-base-cart`.
- `components/cart-page.jsx`: checkout local e criacao de pedido.
- `components/order-confirmation.jsx`: status do pedido e pagamento.
- `components/admin-cad-panel.jsx` e `components/admin-pricing-panel.jsx`: operacao administrativa de CAD e precificacao.

## Pedidos e persistencia

O fluxo de pedidos fica em `lib/order-validation.js`, `lib/order-store.js` e `lib/order-status.js`.

- Sem `DATABASE_URL`, pedidos sao persistidos em `.local-data/orders.dev.json`.
- Com `DATABASE_URL`, `lib/order-store.js` cria e usa tabelas Postgres automaticamente.
- O schema SQL tambem esta documentado em `docs/ops/database.sql`.
- Status de pedido e pagamento ficam centralizados em `lib/order-status.js`.
- Regras de necessidade de CAD ficam em `lib/cad-contract.js`.

## Pagamento

O Mercado Pago fica isolado em `lib/mercado-pago.js`.

- A preferencia usa `NEXT_PUBLIC_SITE_URL` ou `VERCEL_URL` para callbacks.
- O webhook valida assinatura quando `MERCADO_PAGO_WEBHOOK_SECRET` esta definido.
- Webhook local aceita payload `type: "local_test"` fora de producao.

## Precificacao

A precificacao publica usa somente referencias de fatiamento Orca registradas em `lib/sliced-pricing-data.js`.

`calculatePriceBreakdown` procura amostras Orca da mesma familia/formato e calcula custo com `materialGrams` e `printMinutes`. Quando nao existe amostra exata para a medida, o motor interpola as referencias Orca mais proximas.

`lib/pricing-engine.js` concentra calculo de custo com dados de fatiamento real: material, tempo de impressao, energia, taxa de canal e politica comercial. Operacao e embalagem nao entram no custo do produto.

## Produtos, Grasshopper e 3MF

`Produtos/` guarda os arquivos de produto que alimentam a evolucao do catalogo:

- `Produtos/Scripts-GH/*.gh`: scripts Grasshopper por familia/modelo.
- `Produtos/grasshopper_3mf_export_flow.md`: fluxo documentado para exportar modelos 3MF e alimentar dados de precificacao real.

Ao adicionar uma nova familia ou formato, atualize nesta ordem:

1. Adicione ou revise o script em `Produtos/Scripts-GH/`.
2. Atualize `lib/configurator-data.js` com categoria/formato/parametros.
3. Se houver pagina SEO, atualize `lib/site-data.js`.
4. Se houver dados reais de fatiamento, atualize `lib/sliced-pricing-data.js`.
5. Valide o configurador e o carrinho.

## Cuidados ao alterar

- Nao duplique regras de produto em componentes; prefira `lib/configurator-data.js`.
- Nao coloque chaves secretas no repositorio; use `.env.local`.
- Preserve slugs existentes quando eles ja forem usados por URLs publicas.
- Depois de alterar produto ou preco, rode `npm run build`.
- Depois de alterar UI, confira desktop e mobile no navegador.
