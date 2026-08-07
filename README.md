# Baseforma

Aplicacao Next.js para catalogo configuravel e pedidos de sapatas sob medida para mobiliario.

## Visao rapida

- Framework: Next.js App Router, React e CSS global em `app/globals.css`.
- Produto principal: sapatas e ponteiras em TPU, configuraveis por medidas.
- Rotas publicas principais: `/`, `/catalogo`, `/configurar/[categoria]`, `/carrinho`, `/pedido-confirmado`, `/familias/[slug]`, `/como-funciona`, `/processo`, `/projeto-especial` e `/faq`.
- Area do cliente: `/conta`, com acesso por e-mail e numero do pedido, historico, pagamentos, especificacoes e dados de entrega.
- Fluxo comercial: usuario escolhe categoria/formato, configura medidas, adiciona ao carrinho, informa entrega/cupom, cria pedido e pode gerar pagamento via Mercado Pago.
- Administracao: `/admin`, `/admin/pedidos`, `/admin/relatorios` e `/admin/operacao` concentram login operacional, pedidos, indicadores, producao, NF-e automatizada via Focus NFe (com contingencia manual) e expedicao.
- Recuperacao de carrinho: quando o checkout tem e-mail e WhatsApp validos, o site salva um lead de retomada sem disparar mensagens automaticas. Em desenvolvimento fica em `.local-data/cart-recovery.dev.json`; com `DATABASE_URL`, fica na tabela `cart_recovery_leads`.
- Pagamento ativo: Mercado Pago. Nao ha checkout externo de loja na arquitetura do projeto.
- Dados de catalogo e regras de configuracao ficam em `lib/configurator-data.js`.
- Dados institucionais, SEO e familias ficam em `lib/site-data.js`.
- Scripts Grasshopper e fluxo 3MF ficam em `Produtos/`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run start
```

## Variaveis de ambiente

Use `.env.example` como base.

- `DATABASE_URL`: quando definido, pedidos usam Postgres. Sem ele, o app salva pedidos em `.local-data/orders.dev.json`.
- A recuperacao de carrinho usa o mesmo modo de dados: Postgres com `DATABASE_URL` ou JSON local em `.local-data/cart-recovery.dev.json`.
- `CART_RECOVERY_RETENTION_DAYS`: dias de retencao de leads de carrinho antes da limpeza automatica. Padrao: `90`.
- `DATABASE_SSL`: controla SSL da conexao Postgres.
- `NEXT_PUBLIC_SITE_URL`: URL publica usada em callbacks e links.
- `MERCADO_PAGO_ACCESS_TOKEN`: habilita criacao de preferencia de pagamento.
- `MERCADO_PAGO_ENV`: `sandbox` ou `production`; em sandbox, o checkout usa `sandbox_init_point` quando o Mercado Pago retornar esse link.
- `MERCADO_PAGO_STATEMENT_DESCRIPTOR`: nome curto, sem acentos, exibido na fatura quando aceito pelo Mercado Pago. Padrao sugerido: `BASEFORMA`.
- `MERCADO_PAGO_WEBHOOK_SECRET`: valida assinatura do webhook do Mercado Pago quando configurado.
- `ADMIN_ACCESS_TOKEN`: token usado para iniciar sessao nas areas administrativas.
- `ADMIN_SESSION_SECRET`: assina o cookie HttpOnly do admin. Se vazio, usa `ACCOUNT_SESSION_SECRET`; em producao, configure um valor proprio.
- `ACCOUNT_SESSION_SECRET`: assina as sessoes da area do cliente e e obrigatorio em producao.
- `RESEND_API_KEY` e `ACCOUNT_EMAIL_FROM`: enviam o codigo de uso unico da conta em producao.
- `TRANSACTIONAL_EMAIL_FROM` e `TRANSACTIONAL_EMAIL_REPLY_TO`: configuram e-mails opcionais de pedido criado e pagamento aprovado/nao aprovado. Se `TRANSACTIONAL_EMAIL_FROM` nao existir, o app usa `ACCOUNT_EMAIL_FROM`.
- `SHIPPING_PROVIDER`: `manual` ou `melhor_envio`. Em `melhor_envio`, o checkout consulta frete real por `/api/shipping/quote` e o pedido recalcula o frete no servidor antes de salvar.
- `SHIPPING_ORIGIN_POSTAL_CODE`: CEP de origem usado na cotacao real de frete.
- `MELHOR_ENVIO_ENV`, `MELHOR_ENVIO_ACCESS_TOKEN`, `MELHOR_ENVIO_USER_AGENT`, `MELHOR_ENVIO_SERVICE_IDS` e `MELHOR_ENVIO_PREFERRED_SERVICE_IDS`: configuram a integracao Melhor Envio. O `User-Agent` deve conter nome da aplicacao e e-mail tecnico.
- `SHIPPING_PRODUCT_PADDING_CM`, `SHIPPING_PACKAGING_WEIGHT_GRAMS`, `SHIPPING_MIN_PRODUCT_DIMENSION_CM` e `SHIPPING_MIN_PRODUCT_WEIGHT_KG`: ajustes conservadores para transformar medidas das pecas em dados de envio.
- `INVOICE_PROVIDER=focus_nfe`, `FOCUS_NFE_ENV`, `FOCUS_NFE_TOKEN` e `FOCUS_NFE_WEBHOOK_TOKEN`: habilitam emissao, consulta e atualizacao automatica de NF-e. Use `npm run invoice:audit` para validar a configuracao sem imprimir segredos.
- `PRODUCTION_DAILY_UNIT_CAPACITY`: capacidade diaria usada no painel operacional. Padrao interno: `120`.
- `ORCA_*`: configuracoes para integracao local com Orca Slicer.

## Documentacao para agentes

Leia [docs/ai-navigation.md](docs/ai-navigation.md) antes de alterar o projeto. Esse arquivo descreve a estrutura real da aplicacao, pontos de entrada e modulos que concentram regras de negocio.

Para sessoes futuras com agentes, leia tambem [docs/ops/agent-runbook.md](docs/ops/agent-runbook.md). Ele registra decisoes que nao devem ser redescobertas, como deploy por `main`, checkout externo fora da arquitetura, validacoes minimas e cuidados de merge.

O estado de prontidao operacional e o backlog futuro do e-commerce ficam em [docs/ops/ecommerce-roadmap.md](docs/ops/ecommerce-roadmap.md).

A checklist de lancamento controlado fica em [docs/ops/launch-readiness.md](docs/ops/launch-readiness.md).

A ativacao e homologacao de frete real ficam em [docs/ops/shipping-integration.md](docs/ops/shipping-integration.md).
