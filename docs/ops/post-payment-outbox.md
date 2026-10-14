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
- `focus_nfe_invoice`: solicitação fiscal após pagamento aprovado.

`idempotency_key` é única. O Resend também recebe sua chave estável e a Focus
NFe usa a referência estável derivada do pedido. O processamento é pelo menos
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

Falhas determinísticas não são repetidas e vão direto para `failed`
(`NON_RETRYABLE_OUTBOX_CODES` em `lib/outbox-processor.js`): e-mail ou
destinatário ausente, Resend sem chave/remetente, Resend 4xx (`send_rejected`,
exceto 408/409/429), conflito de idempotência do Resend
(`idempotency_conflict`), CPF/CNPJ ausente, credenciais fiscais ausentes e
payload/total fiscal inválido. Corrija o dado ou a configuração e recoloque o
evento em fila pelo `POST /api/admin/outbox`. Em `idempotency_conflict`, confira
no log do Resend se o primeiro envio já foi entregue antes de reprocessar.
Timeouts (`RESEND_TIMEOUT_MS`), 408, 429, 5xx e requisições idempotentes
concorrentes continuam com retry.

O corpo do e-mail de pagamento aprovado usa somente dados imutáveis do evento
(a data exibida é a criação do evento na fila, não `payments.updated_at`), para
que a mesma chave de idempotência do Resend sempre envie o mesmo corpo.

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
