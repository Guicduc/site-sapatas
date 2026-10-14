# Fila pós-pagamento

Com Postgres, o webhook do Mercado Pago confirma o pagamento e cria os eventos
da fila na mesma transação. Por padrão, `OUTBOX_PROCESSING_MODE=inline` processa
até três eventos desse pedido após o commit, antes de responder ao webhook.
Isso preserva o envio imediato sem depender de um agendador ainda não instalado.

`OUTBOX_PROCESSING_MODE=async` responde após o commit e deixa os provedores para
um processador separado. Ative somente depois de homologar a agenda e os retries.
Falhas em ambos os modos permanecem na fila; no modo inline, monitore e reprocesse
as pendências pela API administrativa. Não há retry autônomo sem agendador.

Eventos atuais:

- `payment_customer_email`: comprovante ou falha de pagamento.
- `payment_review_email`: alerta interno para pagamento tardio ou divergente.
- `focus_nfe_invoice`: etapa fiscal apos pagamento aprovado. Durante a pausa (`INVOICE_AUTOMATION_ENABLED=false`), registra `manual_pending` e conclui o evento sem chamar a Focus NFe. Com a automacao ativa, solicita a emissao via API.

## Integridade do status de pagamento

- Um pagamento aprovado só sai de `approved` por disputa (`in_mediation`),
  reembolso ou chargeback (`refunded`). Reembolso é terminal. Snapshots mais
  antigos (`date_last_updated`) e regressões para pendente/recusado/desconhecido
  são ignorados e registrados como `payment.transition_ignored`.
- Pedido pago nunca volta a um status cobrável. Reembolso/chargeback do único
  pagamento que quitava o pedido o leva a `cancelled` (preservando
  `in_production`/`shipped`) e grava `metadata.refund`.
- Revisões bloqueantes ficam em `metadata.paymentReview` e travam NF-e,
  produção e e-mail ao cliente: `amount_mismatch`, `currency_mismatch` e
  `approved_payment_on_cancelled_order`.
- Alertas não bloqueantes ficam em `metadata.paymentAlerts` e enfileiram
  `payment_review_email`: `duplicate_payment`, `partial_refund`,
  `payment_dispute`, `payment_refunded` e `payment_charged_back`.
  Uma cobrança duplicada não repete comprovante nem NF-e, inclusive em
  reentregas. Reembolso parcial e disputa preservam os efeitos da primeira
  confirmação paga observada; suas chaves idempotentes evitam repetições.
  Uma disputa recebida antes da aprovação também valida valor, moeda e
  cancelamento e, quando elegível, solicita NF-e e libera produção.
  O cancelamento fiscal após reembolso continua manual.

`idempotency_key` é única. O Resend também recebe sua chave estável e a Focus
NFe usa a referência estável derivada do pedido quando a automacao esta ativa. Pedidos cujo evento terminou durante a pausa nao sao reenviados automaticamente ao religar; a operacao deve revisar cada pendencia no admin. O processamento é pelo menos
uma vez, portanto essas proteções do provedor são parte do contrato.

## Processamento e visibilidade

- `GET /api/admin/outbox`: lista resumo, status, tentativas e último erro
  sanitizado. Exige sessão ou token administrativo.
- `POST /api/admin/outbox`: com `{ "eventId": "..." }`, recoloca um evento
  terminal em fila. Exige acesso administrativo.
- `POST /api/admin/outbox/process?limit=10`: processa lote limitado. Aceita
  admin ou `Authorization: Bearer <OUTBOX_PROCESSOR_SECRET>`.
- `GET /api/admin/outbox/process?limit=10`: mesma operação para Vercel Cron.
  O bearer pode usar `CRON_SECRET`.

Exemplo manual:

```bash
curl -X POST "https://www.baseforma.com.br/api/admin/outbox/process?limit=10" \
  -H "Authorization: Bearer $OUTBOX_PROCESSOR_SECRET"
```

Cada claim incrementa `attempts` e cria um lease. Falhas voltam para `queued`
com backoff exponencial até `OUTBOX_MAX_ATTEMPTS`; depois ficam `failed` com
erro sanitizado. Lease expirado pode ser retomado. Um lease expirado na última
tentativa vira falha terminal.

O processador HTTP tem limite de 60 segundos e para de reservar eventos quando
nao ha tempo para outro envio completo. Reserva o maior prazo entre duas chamadas
Focus NFe (POST e consulta apos 422) e uma chamada Resend, mais 15 segundos para
o banco; deixa tambem 5 segundos para responder. `limit` continua sendo o maximo
de eventos, e respostas com `budgetExhausted: true` podem conter um lote parcial.
Os demais eventos continuam sem lease e podem ser processados na proxima chamada.

`eventBudgetMs` informa a reserva calculada. Se os timeouts configurados deixarem
esse valor acima dos 55 segundos disponiveis, a resposta tera zero eventos e
`budgetExhausted: true`. Reduza os timeouts ou use um worker com prazo maior antes
de habilitar a agenda. Mantenha `OUTBOX_LEASE_SECONDS` acima do tempo de um evento
com margem para o banco; o padrao de 120 segundos cobre os timeouts padrao.

Não há cron em `vercel.json` por padrão. Mantenha o modo inline até habilitar e testar o processador. Antes de habilitar, confirme a
frequência disponível no plano e o atraso operacional aceitável para e-mail e
NF-e. Depois do deploy, faça uma chamada manual controlada e só então ative a
agenda.

Sem `DATABASE_URL`, o desenvolvimento usa JSON local e executa e-mail/NF-e de
forma síncrona. Esse modo não oferece durabilidade e nunca deve ser usado em
produção.
