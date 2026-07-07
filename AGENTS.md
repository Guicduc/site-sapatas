# AGENTS.md

Instrucoes para agentes trabalhando neste repositorio.

## Leitura obrigatoria

Antes de alterar checkout, pedidos, pagamento, frete, admin, deploy ou documentacao operacional, leia:

- `docs/ops/agent-runbook.md`: runbook pratico para agentes, merge, deploy, validacoes minimas e decisoes fixas.
- `docs/ai-navigation.md`: mapa da estrutura real do projeto.
- `docs/ops/ecommerce-roadmap.md`: estado operacional e backlog futuro.
- `docs/ops/shipping-integration.md`: ativacao e homologacao do frete real.
- `.env.example`: variaveis esperadas por ambiente.
- `PRODUCT.md`: contexto de produto e direcao de UI.

## Decisoes que nao devem ser reabertas sem pedido explicito

- Nao adicione outro checkout/plataforma externa sem pedido explicito do usuario.
- O pagamento ativo e Mercado Pago.
- O checkout proprio deve criar pedido local antes de gerar pagamento.
- Frete real usa Melhor Envio via `lib/shipping.js`; sem credenciais, preserve fallback manual.
- Nota fiscal usa Mercado Pago Sistema de Gestao como emissor operacional, com registro manual no admin.
- Server Actions administrativas devem validar acesso com `assertAdminAccess`.

## Validacao minima

Depois de mudancas de codigo, rode:

```bash
npm run build
```

Depois de merges ou alteracoes em checkout/pagamento, confira que nenhum checkout externo voltou ao codigo:

```bash
rg -n "DRAFT_ORDER|draft-order|STORE_DOMAIN|SHOP_|draftOrder|invoiceUrl" .env.example app lib components package.json
```

Nao deve haver rota de pagamento alternativa nem variaveis de plataforma externa, exceto as explicitamente documentadas para Mercado Pago e Melhor Envio.

## Deploy

- A branch de publicacao e `main`.
- `vercel.json` habilita deploy apenas para `main`.
- Se o Vercel CLI nao estiver instalado, publique por commit e push para `origin/main`.
- Antes de pushar, rode `npm run build`.
- Se `origin/main` estiver adiantada, integre o remoto sem reintroduzir checkout externo. Nao use `git reset --hard` para resolver divergencia.

## Areas sensiveis

- Checkout: `components/cart-page.jsx`, `lib/order-validation.js`, `app/api/orders/route.js`.
- Pagamento: `lib/mercado-pago.js`, `app/api/payments/mercado-pago/preference/route.js`, `app/api/webhooks/mercado-pago/route.js`, `lib/order-store.js`.
- Frete: `lib/shipping.js`, `app/api/shipping/quote/route.js`, `lib/commerce-adjustments.js`.
- Admin: `app/admin/*`, `components/admin-*`, `lib/admin-session.js`.
- Conta: `app/conta/page.js`, `components/account-dashboard.jsx`, `lib/account-session.js`, `lib/account-view.js`.
- Banco: `lib/order-store.js`, `docs/ops/database.sql`.
