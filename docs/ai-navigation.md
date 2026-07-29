# Guia de navegacao para agentes

Este documento existe para orientar agentes de IA que precisam entender ou alterar o projeto sem depender de documentacao antiga.

Antes de alterar checkout, pagamento, frete, admin ou deploy, leia tambem `docs/ops/agent-runbook.md`. Ele registra decisoes operacionais que nao aparecem diretamente no codigo, incluindo deploy por `main`, historico de conflito remoto sobre checkout externo e validacoes minimas.

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
- `/demonstracao/[token]`: ativa por cookie o ambiente de testes isolado, sem persistencia operacional.
- `/conta`: area autenticada do cliente com historico, detalhes, pagamento, cadastro, entrega e suporte. Entra por codigo enviado ao e-mail vinculado ao pedido.
- `/familias/[slug]`: paginas SEO de familias de produto.
- `/como-funciona`, `/processo`, `/projeto-especial`, `/faq`: paginas institucionais.
- `/privacidade`: inventario publico de cookies, armazenamento local e scripts, com acesso ao centro de preferencias.
- `/robots.txt` e `/sitemap.xml`: gerados por `app/robots.js` e `app/sitemap.js`.

## Rotas administrativas

- `/admin/pedidos`: lista pedidos, pagamentos, fila de impressao, nota fiscal automatizada (Focus NFe) e expedicao.
- `/admin/relatorios`: indicadores basicos de receita, status, pagamentos, origem e pedidos recentes.
- `/admin/operacao`: fila de producao, capacidade, nota fiscal automatizada (Focus NFe), expedicao e observacoes internas.
- `/admin`: login operacional. `ADMIN_ACCESS_TOKEN` inicia uma sessao assinada em cookie HttpOnly.
- `lib/admin-session.js`: centraliza validacao de token, sessao e links administrativos. Server Actions devem chamar `assertAdminAccess`.

## APIs

- `POST /api/orders`: cria pedido a partir do carrinho usando `buildOrderDraft` e `createOrder`.
- `GET /api/orders/[id]`: consulta pedido.
- `POST/DELETE /api/account/session`: inicia ou encerra a sessao da conta.
- `POST /api/cart-recovery`: salva ou converte lead de recuperacao de carrinho. O endpoint recalcula totais no servidor e aplica rate limit em memoria.
- `POST /api/shipping/quote`: calcula frete para o checkout. Usa `SHIPPING_PROVIDER=melhor_envio` quando configurado e fallback manual quando nao houver token/CEP de origem.
- `POST /api/payments/mercado-pago/preference`: cria preferencia de pagamento para pedido pagavel.
- `POST /api/webhooks/mercado-pago`: recebe atualizacoes de pagamento do Mercado Pago.
- `GET /api/webhooks/mercado-pago`: health check simples do webhook.
- `GET /api/integrations/health`: health check administrativo de banco, Mercado Pago, frete, e-mail, sessoes e nota fiscal. Exige cookie admin ou token administrativo.
- `GET/POST /api/admin/print-jobs`: lista ou cria jobs idempotentes de geracao de arquivos. Aceita origens alem do pedido do site e exige acesso administrativo.
- `POST /api/admin/print-jobs/claim`: reserva um job com lease para um worker externo.
- `POST /api/admin/print-jobs/[id]/complete` e `/fail`: registram artefatos ou falhas/retries do worker sem executar CAD no processo web.
- `lib/transactional-email.js`: concentra envio via Resend para codigo de conta, pedido criado, pagamento aprovado/nao aprovado e pedido enviado. Nao instancie SDK em escopo global.
- `lib/shipment-notification.js` e `lib/shipment-notification-policy.js`: disparam e registram de forma idempotente o e-mail depois que a expedicao `shipped` foi persistida; falhas nao revertem o status operacional.

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
- `components/cart-provider.jsx`: estado do carrinho em `localStorage` com chave `baseforma-cart`.
- `components/cart-page.jsx`: checkout local, cupom, frete estimado e criacao de pedido.
- `components/order-confirmation.jsx`: status do pedido e pagamento.
- `components/cookie-preferences.jsx`: aviso e revisao do consentimento persistido em `baseforma-cookie-consent`.
- A ficha expandida em `/admin/pedidos` mantem os dados parametricos e o JSON para Grasshopper como apoio ao trabalho manual, sem registrar CAD como etapa do pedido.

## Pedidos e persistencia

O fluxo de pedidos fica em `lib/order-validation.js`, `lib/order-store.js` e `lib/order-status.js`.

## Ajustes comerciais

- `lib/commerce-adjustments.js`: regras compartilhadas de cupom, desconto e frete estimado.
- O carrinho usa esse modulo para preview, mas `lib/order-validation.js` recalcula tudo no servidor antes de salvar o pedido.
- Quando frete/desconto alteram o total, `lib/mercado-pago.js` envia uma linha consolidada ao Mercado Pago para manter o valor cobrado igual ao `order.totalBrl`.
- `lib/cart-recovery.js`: recuperacao de carrinho com hash de token, IP hasheado, recalculo server-side dos itens e retencao por `CART_RECOVERY_RETENTION_DAYS`.
- `lib/shipping.js`: adaptador de frete. O provedor real implementado e `melhor_envio`; dimensoes e peso sao derivados dos itens apenas para montar a requisicao efemera de cotacao.

## Operacao e relatorios

- `lib/fulfillment.js`: estados e normalizacao de producao, nota fiscal operacional, expedicao e capacidade.
- `lib/invoice-config.js`: configuracao fiscal (provider, CNPJ, NCM, CFOP, ambiente) compartilhada por admin e health check.
- `lib/focus-nfe.js`: payload fiscal validado, referencia alfanumerica, rateio de desconto e URLs oficiais por ambiente.
- `lib/invoice-provider.js`: emissao automatica de NF-e via Focus NFe apos pagamento aprovado (emissao, consulta e cancelamento); mantem adaptador `mercado_pago` dormente.
- `scripts/audit-focus-nfe.mjs`: auditoria segura de provider, credenciais e gancho, com verificacao de empresa/certificado quando o token expoe esse endpoint, sem imprimir segredos.
- `lib/order-analytics.js`: agregacoes usadas por `/admin/relatorios`.
- `docs/ops/ecommerce-roadmap.md`: fonte de verdade para prontidao operacional e backlog futuro.
- `docs/ops/print-queue.md`: regra operacional simplificada da fila de impressao.
- `lib/print-job.js` e `lib/print-job-store.js`: contrato, idempotencia, persistencia, lease, artefatos e retries dos jobs de geracao de arquivos.
- `docs/ops/invoice-manual.md`: fluxo de NF-e automatizada via Focus NFe, configuracao fiscal e contingencia manual.
- `docs/ops/shipping-integration.md`: ativacao, variaveis e homologacao de frete real.
- Frete real tem adaptador Melhor Envio, mas so deve ser ativado com `SHIPPING_PROVIDER=melhor_envio`, `SHIPPING_ORIGIN_POSTAL_CODE` e `MELHOR_ENVIO_ACCESS_TOKEN`. Nota fiscal e automatizada via Focus NFe com `INVOICE_PROVIDER=focus_nfe` e `FOCUS_NFE_TOKEN`; sem token, as NFs ficam pendentes.

- Sem `DATABASE_URL`, pedidos sao persistidos em `.local-data/orders.dev.json`.
- O armazenamento JSON e exclusivo de desenvolvimento; producao exige `DATABASE_URL`.
- Com `DATABASE_URL`, `lib/order-store.js` cria e usa tabelas Postgres automaticamente.
- O schema SQL tambem esta documentado em `docs/ops/database.sql`.
- Status de pedido e pagamento ficam centralizados em `lib/order-status.js`.
- A conta usa OTP por e-mail, cookie HttpOnly assinado por `ACCOUNT_SESSION_SECRET` e associacao individual de pedidos confirmados. O acesso temporario pos-checkout e limitado ao pedido recem-criado.
- `lib/cad-contract.js` descreve os modelos e monta o payload manual do Grasshopper, mas nao participa de status, fila ou bloqueio operacional.

## Pagamento

O Mercado Pago fica isolado em `lib/mercado-pago.js`.

- A preferencia usa `NEXT_PUBLIC_SITE_URL` ou `VERCEL_URL` para callbacks.
- `MERCADO_PAGO_ENV=sandbox` usa `sandbox_init_point` quando disponivel; `production` usa `init_point`.
- O webhook valida assinatura quando `MERCADO_PAGO_WEBHOOK_SECRET` esta definido.
- Webhook local aceita payload `type: "local_test"` fora de producao.

## Precificacao

A base de slice e precificacao foi reiniciada em uma unica tabela:

- `Produtos/datasets/slicer_pricing_dataset.csv`: parametros reais do produto, arquivos exportados e dados Orca.
- `Produtos/scripts/gh_export_variations.py`: exporta `.3mf`/`.stl` e cria linhas com parametros do configurador.
- `Produtos/scripts/orca-slice-dataset.mjs`: le essa mesma tabela e preenche `material_grams` e `print_minutes`.
- `Produtos/scripts/audit-pricing-models.mjs`: rejeita configuracoes impossiveis e geometrias incompletas antes que contaminem a precificacao.
- `Produtos/scripts/audit-pricing-coverage.mjs`: mede a cobertura das superficies publicas com leave-one-out IDW-8 e valida em cinco folds o modelo monotono realmente usado pela loja.
- `Produtos/scripts/diagnose-pricing-sweeps.mjs`: percorre todos os sliders publicos usando o motor real de `lib/configurator-data.js`.
- `lib/product-constraints.js`: concentra restricoes cruzadas de fabricacao usadas pelo configurador e pelo pedido.
- `lib/pricing-engine.js`: continua atendendo a validacao administrativa de um STL ja gerado com Orca.

Nao recrie CSV bruto separado do Orca como fonte de preco; ele nao contem medidas das pecas. O site tambem nao deve voltar a usar volume geometrico como fallback comercial.

## Produtos, Grasshopper e 3MF

`Produtos/` guarda os arquivos de produto que alimentam a evolucao do catalogo:

- `Produtos/Scripts-GH/*.gh`: scripts Grasshopper por familia/modelo.
- `Produtos/grasshopper_3mf_export_flow.md`: fluxo documentado para exportar modelos 3MF e alimentar dados de precificacao real.

Ao adicionar uma nova familia ou formato, atualize nesta ordem:

1. Adicione ou revise o script em `Produtos/Scripts-GH/`.
2. Atualize `lib/configurator-data.js` com categoria/formato/parametros.
3. Registre o modelo em `CAD_MODELS` dentro de `lib/cad-contract.js` (chaves de parametros, script GH, defaults tecnicos e variantes de haste). Passo a passo em `docs/catalog/contracts.md`, secao "Como adicionar um produto ao contrato CAD". Esse registro alimenta somente o payload manual do Grasshopper.
4. Se houver pagina SEO, atualize `lib/site-data.js`.
5. Atualize a configuracao de produto dentro de `Produtos/scripts/gh_export_variations.py`.
6. Rode `npm run export:gh`, `npm run slice:dataset`, `npm run pricing:build-data`, `npm run pricing:check` e `npm run pricing:audit`.
7. Valide o configurador, o carrinho e o payload manual no admin (`/admin/pedidos`, secao "Dados para Grasshopper").

## Cuidados ao alterar

- Leia `docs/ops/agent-runbook.md` antes de fazer merge, deploy ou mudancas no fluxo comercial.
- Nao duplique regras de produto em componentes; prefira `lib/configurator-data.js`.
- Nao coloque chaves secretas no repositorio; use `.env.local`.
- Preserve slugs existentes quando eles ja forem usados por URLs publicas.
- Depois de alterar produto ou preco, rode `npm run build`.
- Depois de alterar UI, confira desktop e mobile no navegador.
