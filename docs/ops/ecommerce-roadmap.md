# Prontidao operacional do e-commerce

Este documento registra o estado atual do e-commerce e os pontos que ficaram intencionalmente para uma fase futura.

Para execucao por agentes, merge, deploy e validacao minima, use tambem `docs/ops/agent-runbook.md`.
Para continuidade da ativacao de Mercado Pago e caixas de e-mail do dominio, use tambem `docs/ops/payment-email-handoff.md`.

## Escopo ativo agora

- Pagamento ativo: Mercado Pago.
- Plataforma propria: catalogo, configurador, carrinho, checkout, pedido, conta do cliente e administracao rodam no proprio site.
- Checkout externo de loja nao faz parte da arquitetura atual nem do roadmap futuro.
- Frete tem adaptador real para Melhor Envio, com fallback manual quando credenciais/CEP de origem nao estiverem configurados.
- Nota fiscal esta em modo manual/operacional, sem fornecedor externo contratado no codigo.

## Ja implementado

- Painel de produtos via catalogo configuravel em `lib/configurator-data.js` e rotas `/catalogo` e `/configurar/[categoria]`.
- Gestao de pedidos em `/admin/pedidos`, com dados persistidos em Postgres quando `DATABASE_URL` existe.
- Cadastro de clientes e area do cliente em `/conta`, com acesso por codigo enviado por e-mail.
- Carrinho e checkout em `/carrinho`, com validacao server-side antes de criar pedido.
- Cupons, desconto e frete estimado em `lib/commerce-adjustments.js`.
- Cotacao real de frete em `/api/shipping/quote` e `lib/shipping.js`, usando Melhor Envio quando `SHIPPING_PROVIDER=melhor_envio`.
- Pagamento Mercado Pago em `lib/mercado-pago.js`, `POST /api/payments/mercado-pago/preference` e `POST /api/webhooks/mercado-pago`.
- E-mails transacionais via Resend para codigo de conta, pedido criado e pagamento resolvido.
- Recuperacao de carrinho sem disparo automatico, com leads em `cart_recovery_leads` ou `.local-data/cart-recovery.dev.json`.
- Retencao configuravel de leads de carrinho por `CART_RECOVERY_RETENTION_DAYS`.
- Relatorios basicos em `/admin/relatorios`.
- Operacao de producao, nota fiscal manual e expedicao em `/admin/operacao`.
- Capacidade operacional de producao configuravel por `PRODUCTION_DAILY_UNIT_CAPACITY`.
- Login administrativo em `/admin`, com `ADMIN_ACCESS_TOKEN` usado para criar sessao assinada em cookie HttpOnly.

## Condicoes para operar em producao

- Estado externo em 29/06/2026:
  - Dominio `baseforma.com.br` comprado no Registro.br e zona DNS em modo avancado.
  - DNS salvo com `A` do dominio raiz para Vercel, `CNAME www` para Vercel e registros de envio Resend para DKIM/SPF/MX no subdominio `send`.
  - Dominio no Resend criado em Sao Paulo (`sa-east-1`); confirmar verificacao antes da abertura real.
  - Neon Postgres criado no Vercel (`neon-cordovan-fence`, regiao Sao Paulo) e conectado ao projeto com `DATABASE_URL`; schema de `docs/ops/database.sql` aplicado.
  - Env vars de e-mail, sessoes/admin, URL publica, frete manual, origem `05713420`, nota manual e capacidade operacional foram adicionadas no Vercel para Production/Preview.
  - Mercado Pago teve credenciais produtivas e webhook configurados no Vercel; antes da abertura real, ainda e obrigatorio validar pedido teste ponta a ponta, recebimento de webhook e estados no admin/conta.
  - Melhor Envio permanece em fallback manual; ativar apenas apos token e homologacao de cotacao.
- Definir `DATABASE_URL` e confirmar que o banco executa o schema documentado em `docs/ops/database.sql`.
- Definir `NEXT_PUBLIC_SITE_URL` com a URL publica final.
- Definir `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_ENV`, `MERCADO_PAGO_STATEMENT_DESCRIPTOR` e configurar o webhook no painel do Mercado Pago.
- Definir `MERCADO_PAGO_WEBHOOK_SECRET` em producao.
- Definir `ADMIN_ACCESS_TOKEN` forte e fora do repositorio.
- Definir `ADMIN_SESSION_SECRET` forte e fora do repositorio.
- Definir `ACCOUNT_SESSION_SECRET` forte e fora do repositorio.
- Definir `RESEND_API_KEY`, `ACCOUNT_EMAIL_FROM`, `TRANSACTIONAL_EMAIL_FROM` e `TRANSACTIONAL_EMAIL_REPLY_TO`.
- Para frete real, definir `SHIPPING_PROVIDER=melhor_envio`, `SHIPPING_ORIGIN_POSTAL_CODE`, `MELHOR_ENVIO_ACCESS_TOKEN` e `MELHOR_ENVIO_USER_AGENT`.
- Homologar dimensoes/peso de envio com pedidos reais antes de trocar `MELHOR_ENVIO_ENV` para `production`.
- Confirmar `CART_RECOVERY_RETENTION_DAYS` conforme a politica de atendimento e privacidade.
- Confirmar que nota fiscal sera tratada manualmente ate escolher fornecedor.

## Backlog futuro

- Usuarios administrativos nominais, papeis e trilha de auditoria por operador.
- Compra de etiqueta, impressao e rastreio no Melhor Envio, depois da homologacao de cotacao.
- Integracao real de nota fiscal com fornecedor escolhido, incluindo emissao, cancelamento e armazenamento de chave/documento.
- Regras avancadas de cupons: limites por cliente, validade, uso maximo e campanha.
- Automacao de recuperacao de carrinho por e-mail ou WhatsApp, somente depois de aprovar texto, consentimento e frequencia.
- Estoque de insumos ou capacidade por maquina, se a operacao deixar de ser apenas sob demanda.
- Testes E2E de checkout, webhook, conta, admin e operacao.
- Observabilidade de producao: logs estruturados, alertas para falha de pagamento, erro de e-mail e fila operacional.
- LGPD operacional: tela de exclusao/anonimizacao de cliente e politica formal de retencao.
- Canais externos de venda somente se houver decisao futura de sincronizacao sem substituir o checkout proprio.

## Ordem recomendada da proxima fase

1. Implementar usuarios administrativos nominais, papeis e auditoria.
2. Homologar frete Melhor Envio em sandbox com token, CEP de origem, servicos permitidos e pedidos reais.
3. Escolher fornecedor de nota fiscal e implementar adaptador isolado.
4. Adicionar testes E2E dos fluxos criticos.
5. Implementar automacao de recuperacao de carrinho com consentimento.
