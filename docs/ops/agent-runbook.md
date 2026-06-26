# Runbook para agentes

Use este arquivo no inicio de sessoes futuras antes de alterar checkout, pedidos, pagamento, frete, admin ou deploy.

## Fontes de verdade

- Estrutura do projeto: `docs/ai-navigation.md`.
- Estado operacional e backlog: `docs/ops/ecommerce-roadmap.md`.
- Frete real: `docs/ops/shipping-integration.md`.
- Banco de dados: `docs/ops/database.sql`.
- Variaveis de ambiente: `.env.example`.
- Contexto de produto/design para UI: `PRODUCT.md`.

## Decisoes fixas

- Nao adicione outro checkout/plataforma externa sem pedido explicito do usuario.
- O pagamento ativo e Mercado Pago.
- O checkout proprio do site deve continuar criando pedido local antes de gerar pagamento.
- Frete real usa o adaptador Melhor Envio em `lib/shipping.js`; sem credenciais, o site deve continuar com fallback manual.
- Nota fiscal externa ainda nao tem fornecedor ativo; mantenha `INVOICE_PROVIDER=manual`.
- O admin usa `/admin` para criar sessao assinada por cookie HttpOnly; Server Actions administrativas devem validar acesso com `assertAdminAccess`.

Se algum branch, PR ou merge trouxer outro checkout/plataforma externa, remova antes de publicar. Tambem remova variaveis de loja externa, rotas alternativas de pagamento, webhooks de plataforma de loja, bibliotecas dedicadas a esse provedor e textos que tratem esse caminho como futuro.

## Fluxo de checkout

1. `components/cart-page.jsx` mostra carrinho, endereco, cupom, frete e cria pedido.
2. `POST /api/shipping/quote` consulta frete para preview no checkout.
3. `POST /api/orders` chama `buildOrderDraft`.
4. `lib/order-validation.js` recalcula itens, cupom e frete no servidor antes de salvar.
5. `lib/order-store.js` persiste pedido e pagamentos.
6. `POST /api/payments/mercado-pago/preference` cria a preferencia Mercado Pago.
7. `POST /api/webhooks/mercado-pago` atualiza status de pagamento e pedido.

Nunca confie no total enviado pelo navegador. Itens, desconto, frete e total precisam ser recalculados no servidor.

## Frete

- Ativar frete real exige `SHIPPING_PROVIDER=melhor_envio`, `SHIPPING_ORIGIN_POSTAL_CODE`, `MELHOR_ENVIO_ACCESS_TOKEN` e `MELHOR_ENVIO_USER_AGENT`.
- Use sandbox primeiro: `MELHOR_ENVIO_ENV=sandbox`.
- A cotacao do Melhor Envio usa produtos com dimensoes em cm, peso em kg e valor em reais.
- A compra de etiqueta, impressao e rastreio ainda nao estao implementados.
- Para testar fallback manual localmente, deixe `SHIPPING_PROVIDER=manual` e chame `POST /api/shipping/quote`.

## Deploy

- O remoto Git e `origin` em `https://github.com/Guicduc/site-sapatas`.
- A branch de publicacao e `main`.
- `vercel.json` habilita deploy apenas para `main`:
  - `main`: `true`
  - `*`: `false`
- O Vercel CLI pode nao estar instalado no ambiente local. Nesse caso, o deploy deve ser disparado por commit e push para `origin/main`.
- Antes de pushar, rode `npm run build`.
- Se `git push origin main` for recusado por remoto adiantado, use:
  1. `git fetch origin main`
  2. inspecione `git log --oneline --decorate --graph --max-count=8 --all`
  3. integre o remoto sem reintroduzir checkout externo
  4. rode `npm run build`
  5. faça push novamente

Nao use `git reset --hard` para resolver divergencia remota. Preserve mudancas locais e resolva conflitos arquivo a arquivo.

## Validacao minima

Rode sempre:

```bash
npm run build
```

Para checkout/frete, com dev server ativo:

```powershell
$body = @{
  items = @(@{
    id='test-1'
    categorySlug='sapata-base-lisa'
    formatSlug='redonda'
    values=@{ diametro=28; alturaBase=6; pescoco=$false; alturaPescoco=12; diametroPescoco=8 }
    quantity=4
  })
  shippingAddress = @{ postalCode='01001000'; state='SP'; city='Sao Paulo' }
  couponCode=''
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri http://127.0.0.1:3002/api/shipping/quote -Method Post -ContentType 'application/json' -Body $body
```

Resultado esperado sem credenciais: resposta `200` com `shippingQuote.provider` igual a `manual` ou `source` igual a `manual_fallback`.

## Arquivos sensiveis por area

- Checkout: `components/cart-page.jsx`, `lib/order-validation.js`, `app/api/orders/route.js`.
- Pagamento: `lib/mercado-pago.js`, `app/api/payments/mercado-pago/preference/route.js`, `app/api/webhooks/mercado-pago/route.js`, `lib/order-store.js`.
- Frete: `lib/shipping.js`, `app/api/shipping/quote/route.js`, `lib/commerce-adjustments.js`.
- Conta do cliente: `app/conta/page.js`, `components/account-dashboard.jsx`, `lib/account-session.js`, `lib/account-view.js`.
- Admin: `app/admin/*`, `components/admin-*`, `lib/admin-session.js`, `lib/fulfillment.js`, `lib/order-analytics.js`.
- Banco: `lib/order-store.js`, `docs/ops/database.sql`.

## Cuidados de merge

- `origin/main` ja recebeu historico externo que tentou migrar o checkout para uma plataforma de loja externa. Essa direcao esta cancelada.
- Ao aceitar arquivos remotos de catalogo, imagens ou precificacao, confira se eles nao alteram o checkout/pagamento para outro provedor.
- Depois de qualquer merge, rode:

```bash
rg -n "DRAFT_ORDER|draft-order|STORE_DOMAIN|SHOP_|draftOrder|invoiceUrl" .env.example app lib components package.json
```

Nao deve haver rota de pagamento alternativa nem variaveis de plataforma externa, exceto as explicitamente documentadas para Mercado Pago e Melhor Envio.
