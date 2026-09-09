# Integracao com o sistema externo de producao

## Limite do sistema

O site continua sendo a fonte de verdade para o pedido comprado e para os
marcos comerciais mostrados ao cliente. O sistema externo recebe somente um
snapshot imutavel dos itens pagos e devolve `accepted`, `produced` ou `failed`.

O contrato nao envia cliente, documento, contato, endereco, precos, pagamento,
NF-e, frete ou o bloco completo de metadata. Tambem nao envia nem recebe modelo
CAD, Grasshopper, transformacoes de sliders, slice, maquina, lease, retry ou
artefato. Esses detalhes pertencem ao sistema externo.

`shipped` nao faz parte da versao 1. A expedicao continua no admin do site.
Hoje o status e persistido e, depois, a notificacao e enviada diretamente; nao
existe uma transicao compartilhada e duravel segura para um emissor externo.

## Configuracao

```dotenv
PRODUCTION_SYSTEM_MODE=disabled
PRODUCTION_SYSTEM_TOKEN=
```

Modos:

- `disabled`: nao cria nem libera snapshots pela integracao.
- `shadow`: cria e reconcilia snapshots, mas o pull devolve `works: []`.
- `active`: libera trabalho elegivel, aceita acknowledgements e marcos.

O token e dedicado a esta integracao. `ADMIN_ACCESS_TOKEN` e o cookie do admin
nao autenticam estas rotas. Envie sempre:

```http
Authorization: Bearer <PRODUCTION_SYSTEM_TOKEN>
X-Production-Consumer-Id: factory-primary
```

Todas as rotas exigem Postgres. O codigo nao cria tabelas durante requests.
Aplique a migration antes do deploy:

```bash
npm run db:migrate
npm run db:migrate
```

A segunda execucao deve retornar `applied: []`.

## Pull

```http
GET /api/production/v1/work?limit=10
```

Resposta ativa:

```json
{
  "schemaVersion": 1,
  "mode": "active",
  "works": [
    {
      "schemaVersion": 1,
      "workId": "production-work-v1:order-id",
      "order": {
        "orderId": "order-id",
        "orderNumber": "BF-260821-AB12"
      },
      "items": [
        {
          "itemId": "item-id",
          "sku": "BF-RD-28",
          "categorySlug": "sapata-base-lisa",
          "formatSlug": "redonda",
          "configuration": {
            "diametro": 28,
            "alturaBase": 6,
            "pescoco": false
          },
          "color": "Preta",
          "finish": "Fosco",
          "quantity": 4
        }
      ]
    }
  ]
}
```

O pull nao cria lease. O consumidor controla ritmo e retries. Enquanto o
trabalho nao for reconhecido, chamadas posteriores devolvem o mesmo `workId` e
o mesmo snapshot persistido. Chamadas concorrentes usam `skip locked` para
reduzir duplicidade imediata, mas o contrato continua sendo pelo menos uma vez.

No modo `shadow`, a chamada reconcilia pedidos elegiveis e responde sem
trabalhos. Isso permite auditar o staging antes do corte.

## Acknowledgement

```http
POST /api/production/v1/work/{workId-url-encoded}/ack
Content-Type: application/json

{
  "idempotencyKey": "factory-ack-01J..."
}
```

Repita a mesma chave em retries. O site devolve o mesmo acknowledgement. Uma
chave reutilizada para outro trabalho ou um segundo acknowledgement com outra
chave retorna `409`. Depois do acknowledgement, o trabalho sai do pull.

O acknowledgement confirma recebimento. Ele nao muda o estado comercial. O
marco `accepted` informa que a producao aceitou o trabalho.

## Marcos comerciais

```http
POST /api/production/v1/milestones
Content-Type: application/json

{
  "eventId": "factory-event-01J...",
  "workId": "production-work-v1:order-id",
  "milestone": "accepted",
  "occurredAt": "2026-08-21T15:30:00Z"
}
```

Para `failed`, o campo opcional `failureReason` aceita somente:

- `production_error`
- `quality_issue`
- `material_unavailable`
- `capacity_unavailable`
- `unknown`

O site nao aceita texto livre, stack trace ou payload tecnico de falha.
`occurredAt` deve crescer estritamente para cada trabalho. Eventos atrasados ou
com o mesmo instante do ultimo marco aplicado retornam `409`.

| Marco | Estado persistido no pedido |
| --- | --- |
| `accepted` | `production.status: in_production` |
| `produced` | `production.status: ready_to_ship` |
| `failed` | `production.status: blocked` |

O endpoint exige acknowledgement anterior. `produced` exige trabalho aceito e
nao pode regredir para `accepted`. Pedidos cancelados ou expedidos rejeitam
novos marcos. `eventId` e unico: repetir o mesmo evento devolve o resultado
gravado; reutiliza-lo com outro conteudo retorna `409`.

O evento idempotente e a atualizacao de `orders.metadata.fulfillment` ficam na
mesma transacao e usam lock no pedido. O admin grava os mesmos estados no mesmo
bloco de fulfillment e continua sendo a contingencia humana.

## Roteamento e ponte `print_jobs`

`production_work_routes` decide uma vez por pedido:

- `legacy_print_queue`: permanece na ponte `print_jobs`.
- `external`: pertence ao pull externo.

A migration marca como `legacy_print_queue` todos os pedidos que ja possuem
`print_jobs` de origem `site_order` e tambem os que ja possuem status comercial
historico de producao/CAD ou entraram em producao fisica manual, mesmo sem job
de arquivo. O pull nunca os libera. A sincronizacao
do admin consulta a mesma decisao e nao cria jobs para pedidos externos. A
chave primaria por pedido fecha a corrida entre as duas entradas.

Durante `disabled` e `shadow`, uma transicao manual para producao iniciada,
bloqueada ou concluida tambem fixa a rota legada. Isso impede que trabalho
manual iniciado durante a homologacao apareca no primeiro pull ativo.

Ao trocar para `active`, todo pedido ainda sem rota passa deterministicamente a
`external`, inclusive se o admin tentar sincroniza-lo antes do primeiro pull.
Pagamentos aprovados em `active` gravam snapshot, rota externa e liberacao na
mesma transacao. A ordem das requests nao decide a fila.

Desativar a integracao nao apaga essa decisao. Um pedido ja roteado para o
sistema externo nao deve ser reinserido em `print_jobs` durante rollback.

## Health e observacao

O sistema externo consulta:

```http
GET /api/production/v1/health
```

A resposta mostra modo, armazenamento e contagens de staging, pendentes,
suprimidos por mudanca comercial, rejeitados por snapshot historico invalido,
reconhecidos, marcos e rotas. Nao mostra
token nem snapshots. O admin tambem ve a
integracao em `GET /api/integrations/health` com acesso administrativo.

## Ativacao segura

1. Confirme backup/restore point do Postgres.
2. Aplique `20260821_production_system_handoff.sql` e rode a migration de novo.
3. Publique o codigo com `PRODUCTION_SYSTEM_MODE=disabled`.
4. Configure um `PRODUCTION_SYSTEM_TOKEN` novo e longo nos dois sistemas.
5. Troque para `shadow` e faca pulls autenticados para materializar o staging.
6. Audite `production_work_routes`, `production_handoffs` e todos os
   `print_jobs` ativos. Conclua, cancele ou migre cada job legado por item.
7. Valide snapshots reais sem copiar dados pessoais, fiscais ou de pagamento.
8. Aprove o instante do corte e troque para `active`.
9. Valide pull repetido, acknowledgement, `accepted`, `produced` e `failed` no
   admin e na conta do cliente.
10. Mantenha `print_jobs` disponivel ate encerrar a auditoria, treinamento e
    janela de rollback.

## Rollback

Troque o modo para `shadow` ou `disabled` para interromper novas entregas. Nao
apague handoffs, eventos nem rotas. Pedidos ja roteados externamente continuam
sob responsabilidade do sistema externo ou da contingencia manual no admin.
Nao os envie a `print_jobs` sem reconciliacao explicita.

Para rotacionar a credencial, atualize o consumidor e `PRODUCTION_SYSTEM_TOKEN`
em uma janela controlada. O token anterior deixa de funcionar assim que o novo
valor entra no site.
