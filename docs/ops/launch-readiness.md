# Checklist de lancamento controlado

Use este checklist antes de abrir o site para pedidos reais ou antes de uma janela controlada de producao.

Escopo fixo da operacao:

- Checkout proprio do site.
- Pagamento via Mercado Pago.
- Frete por Melhor Envio quando homologado, com fallback manual preservado.
- Nota fiscal em modo manual, com `INVOICE_PROVIDER=manual`.
- Admin protegido por sessao e token operacional.

## 1. Pre-lancamento

- Confirmar que a publicacao sera feita pela branch `main`.
- Confirmar `NEXT_PUBLIC_SITE_URL` com a URL publica final.
- Confirmar `DATABASE_URL` ativo em producao e schema aplicado conforme `docs/ops/database.sql`.
- Confirmar segredos fortes e fora do repositorio:
  - `ADMIN_ACCESS_TOKEN`
  - `ADMIN_SESSION_SECRET`
  - `ACCOUNT_SESSION_SECRET`
  - `MERCADO_PAGO_ACCESS_TOKEN`
  - `MERCADO_PAGO_WEBHOOK_SECRET`
  - `RESEND_API_KEY`
- Confirmar e-mails:
  - `ACCOUNT_EMAIL_FROM`
  - `TRANSACTIONAL_EMAIL_FROM`
  - `TRANSACTIONAL_EMAIL_REPLY_TO`
- Confirmar pagamento:
  - `MERCADO_PAGO_ENV=sandbox` para teste controlado ou `production` para abertura real.
  - `MERCADO_PAGO_STATEMENT_DESCRIPTOR=BASEFORMA` ou valor aprovado.
  - Webhook configurado no painel Mercado Pago para `/api/webhooks/mercado-pago`.
- Confirmar frete:
  - Para lancamento manual: `SHIPPING_PROVIDER=manual`.
  - Para Melhor Envio homologado: `SHIPPING_PROVIDER=melhor_envio`, `SHIPPING_ORIGIN_POSTAL_CODE`, `MELHOR_ENVIO_ACCESS_TOKEN` e `MELHOR_ENVIO_USER_AGENT`.
- Confirmar `INVOICE_PROVIDER=manual`.
- Confirmar `PRODUCTION_DAILY_UNIT_CAPACITY` com a capacidade real do dia.
- Rodar antes do deploy:

```bash
npm run build
```

- Conferir que nenhum checkout externo voltou ao codigo:

```bash
rg -n "DRAFT_ORDER|draft-order|STORE_DOMAIN|SHOP_|draftOrder|invoiceUrl" .env.example app lib components package.json
```

Resultado esperado: nenhuma rota de pagamento alternativa nem variaveis de plataforma externa, exceto Mercado Pago e Melhor Envio.

## 2. Smoke test publico

Execute em producao ou no preview que sera promovido:

- Abrir `/api/integrations/health` autenticado como admin e confirmar que os blocos criticos estao `ok`.
- Tratar o health check como verificacao de configuracao. Ele nao substitui pedido teste, webhook recebido nem e-mail entregue.
- Abrir `/` e confirmar que a home carrega sem erro visual grosseiro.
- Abrir `/catalogo` e confirmar categorias de sapatas.
- Abrir uma rota `/configurar/[categoria]`, alterar medidas e adicionar item ao carrinho.
- Abrir `/carrinho` e confirmar:
  - item configurado;
  - preco recalculado;
  - formulario de entrega;
  - cotacao ou fallback de frete;
  - botao de criar pedido.
- Criar um pedido teste com dados identificaveis como teste operacional.
- Abrir `/pedido-confirmado` pelo fluxo normal apos pedido/pagamento.
- Abrir `/conta` e validar pedido por e-mail/codigo, se envio de e-mail estiver ativo.

## 3. Pedido teste Mercado Pago

Use ambiente sandbox ate a conta, credenciais, callbacks e webhook estarem verificados.

- Criar pedido pelo checkout proprio; nao criar pagamento sem pedido local.
- Gerar preferencia Mercado Pago a partir do pedido criado.
- Confirmar que o valor no Mercado Pago bate com `order.totalBrl`.
- Concluir pagamento com credencial/cartao de teste do Mercado Pago.
- Confirmar retorno para o site.
- Conferir status do pedido no admin e na conta do cliente.
- Conferir que o pagamento registrado pertence ao pedido local correto.

Para abertura real, repita com valor baixo e controlado em `MERCADO_PAGO_ENV=production`, se a operacao aceitar o custo do teste.

## 4. Webhook Mercado Pago

- Confirmar que `MERCADO_PAGO_WEBHOOK_SECRET` esta definido em producao.
- Confirmar no painel Mercado Pago que o endpoint publico aponta para:

```text
https://baseforma.com.br/api/webhooks/mercado-pago
```

- Chamar o health check do webhook:

```text
GET /api/webhooks/mercado-pago
```

- Apos o pagamento teste, confirmar que o webhook atualizou:
  - status do pagamento;
  - status do pedido;
  - historico administrativo;
  - e-mail transacional, quando aplicavel.
- Se o webhook nao chegar, consultar logs do deploy antes de repetir pagamentos.

## 5. E-mail transacional

- Confirmar dominio Resend verificado.
- Confirmar remetentes com dominio autorizado:
  - `ACCOUNT_EMAIL_FROM`
  - `TRANSACTIONAL_EMAIL_FROM`
- Testar codigo de acesso da conta em `/conta`.
- Confirmar recebimento de e-mail de pedido criado.
- Confirmar recebimento de e-mail de pagamento aprovado ou nao aprovado.
- Confirmar que `TRANSACTIONAL_EMAIL_REPLY_TO` aponta para caixa monitorada pela operacao.
- Se e-mail falhar, manter atendimento manual ativo e consultar logs antes de reprocessar mensagens.

## 6. Admin e operacao

- Entrar em `/admin` com `ADMIN_ACCESS_TOKEN`.
- Confirmar acesso a:
  - `/admin/pedidos`
  - `/admin/relatorios`
  - `/admin/operacao`
- Abrir o pedido teste e validar:
  - dados do cliente;
  - itens e especificacoes;
  - total, desconto e frete;
  - status de pagamento;
  - fila de producao;
  - nota fiscal manual;
  - expedicao.
- Confirmar que a equipe sabe qual status mover manualmente em caso de pagamento aprovado.
- Confirmar que nenhuma Server Action administrativa foi exposta sem `assertAdminAccess` em alteracoes recentes.

## 7. Frete manual

Use este caminho quando o Melhor Envio ainda nao estiver homologado ou quando houver instabilidade externa.

- Manter `SHIPPING_PROVIDER=manual`.
- Criar pedido teste com CEP valido.
- Confirmar que o checkout exibe frete por fallback manual.
- Confirmar no pedido/admin que a origem do frete ficou documentada como manual ou fallback manual.
- Confirmar que atendimento sabe revisar custo/prazo antes de produzir ou despachar.

## 8. Melhor Envio

Ative apenas depois da homologacao descrita em `docs/ops/shipping-integration.md`.

- Definir:
  - `SHIPPING_PROVIDER=melhor_envio`
  - `SHIPPING_ORIGIN_POSTAL_CODE`
  - `MELHOR_ENVIO_ENV=sandbox` no teste
  - `MELHOR_ENVIO_ACCESS_TOKEN`
  - `MELHOR_ENVIO_USER_AGENT`
- Testar carrinhos pequenos, medios, grandes e com multiplos itens.
- Comparar preco e prazo do site com a cotacao no painel Melhor Envio.
- Ajustar, se necessario:
  - `SHIPPING_PRODUCT_PADDING_CM`
  - `SHIPPING_PACKAGING_WEIGHT_GRAMS`
  - `SHIPPING_MIN_PRODUCT_DIMENSION_CM`
  - `SHIPPING_MIN_PRODUCT_WEIGHT_KG`
  - `MELHOR_ENVIO_SERVICE_IDS`
  - `MELHOR_ENVIO_PREFERRED_SERVICE_IDS`
- Manter compra de etiqueta, impressao e rastreio como processo externo/manual, pois ainda nao estao implementados no site.
- So trocar para `MELHOR_ENVIO_ENV=production` apos comparacao operacional aprovada.

## 9. Nota fiscal manual

- Manter `INVOICE_PROVIDER=manual`.
- Em `/admin/operacao`, conferir pedidos pagos que precisam de nota.
- Emitir a nota no processo externo definido pela empresa.
- Registrar manualmente no fluxo operacional o estado da nota e qualquer observacao necessaria.
- Nao adicionar fornecedor, API ou variavel de NF sem decisao explicita.

## 10. Go/no-go

Abrir para pedidos reais somente se todos os itens abaixo estiverem verdadeiros:

- Build passou.
- Banco de producao ativo.
- Pedido teste criado pelo checkout proprio.
- Preferencia Mercado Pago criada a partir do pedido local.
- Pagamento teste concluiu ou falhou de forma rastreavel.
- Webhook recebido ou logs explicam a falha antes da abertura.
- E-mails essenciais testados ou atendimento manual preparado.
- Admin acessivel e pedido teste visivel.
- Frete manual validado ou Melhor Envio homologado.
- NF manual operacionalmente coberta.
- Responsavel de atendimento acompanhando a primeira janela.

## 11. Rollback

Se houver erro critico durante a janela controlada:

- Pausar divulgacao e nao iniciar novos testes de pagamento.
- Registrar horario, URL, pedido afetado e sintoma.
- Conferir logs do Vercel, Mercado Pago e banco antes de alterar codigo.
- Se o problema for deploy recente, voltar para o ultimo deploy estavel pelo painel Vercel ou publicar commit de reversao pela branch `main`.
- Se o problema for Mercado Pago:
  - manter pedidos criados;
  - nao recriar pedidos sem necessidade;
  - orientar cliente pelo status real no painel Mercado Pago.
- Se o problema for frete Melhor Envio:
  - voltar `SHIPPING_PROVIDER=manual`;
  - redeployar;
  - validar cotacao manual em `/carrinho`.
- Se o problema for e-mail:
  - manter checkout ativo somente se a equipe puder acompanhar pedidos pelo admin;
  - usar atendimento manual para confirmacoes urgentes.
- Se o problema for banco:
  - pausar checkout;
  - preservar logs;
  - nao migrar para JSON local em producao.
- Apos rollback, repetir smoke test e pedido teste antes de reabrir.
