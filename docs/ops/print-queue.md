# Fila de producao

Este documento registra a regra operacional da fila de producao usada no admin.

## Objetivo

Manter uma lista simples de pedidos pagos que aguardam producao. A preparacao de arquivos pode ser assistida por um worker externo, mas continua sem bloquear a fila do pedido.

## Duas filas, responsabilidades diferentes

- `print_jobs`: orquestra a geracao de STL/3MF/preview a partir de um snapshot do contrato CAD. O site persiste e acompanha o job; Rhino, Grasshopper e Orca nao rodam no processo web.
- fila de producao em `orders.metadata.fulfillment`: organiza a producao fisica do pedido independentemente do estado dos jobs de arquivo.

Separar essas etapas evita prender uma Server Action a um executavel local e permite que um worker Windows, uma estacao CAD ou outra frente usem o mesmo contrato.

## Entrada na fila de producao

Um pedido entra na fila quando:

- foi criado no checkout proprio;
- tem pagamento aprovado pelo Mercado Pago;
- nao esta cancelado;
- ainda nao foi expedido.

Pedidos criados sem pagamento continuam visiveis no filtro `Pagamento`, mas nao devem ocupar posicao na fila. Revisoes tecnicas excepcionais continuam como bloqueio separado quando a configuracao do pedido for invalida.

## Jobs de geracao de arquivos

O admin oferece **Sincronizar pedidos pagos**. A operacao usa `getGrasshopperPayload` para cada pedido pago, ativo e com modelo registrado no contrato CAD. A chave idempotente combina origem, item, versoes do contrato/modelo e material/perfil; repetir a sincronizacao retorna o mesmo job em vez de duplicar trabalho.

O modelo `print_jobs` registra:

- `origin`: `source`, `sourceId`, `sourceItemId`, rotulo e metadados. Pedidos usam `site_order`, mas a tabela e a API nao dependem dessa origem;
- `contract`: snapshot imutavel das versoes, engine, modo de geracao, arquivo fonte, parametros, defaults tecnicos e saidas solicitadas;
- `material`: codigo, cor, perfil, lote e notas;
- `priority`, `attempts`, `maxAttempts`, disponibilidade e lease;
- `artifacts`: tipo, nome, URI, checksum, tamanho e metadados;
- `error`: codigo, mensagem, indicacao de retry, instante e detalhes.

Estados validos:

- `queued`: disponivel ou aguardando o instante de retry;
- `processing`: reservado temporariamente por um worker;
- `succeeded`: worker registrou um ou mais artefatos;
- `failed`: erro definitivo ou tentativas esgotadas;
- `cancelled`: reservado para cancelamento operacional futuro.

Artefatos e erros permanecem no job e nao criam status, gate ou bloqueio CAD no pedido. A fila de producao continua simples (`Aguardando producao` -> `Produzido`), enquanto o admin usa os jobs como rastreio tecnico separado.

## Contrato do worker

Todas as rotas abaixo chamam `assertAdminAccess`. Um worker pode enviar `ADMIN_ACCESS_TOKEN` em `x-admin-token` ou `Authorization: Bearer ...`; o admin no navegador usa a sessao HttpOnly.

1. `POST /api/admin/print-jobs/claim` com `{ "workerId": "cad-windows-01" }` reserva o proximo job por prioridade e retorna `job` + `claimToken`.
2. O worker executa a geracao fora do site, usando apenas o snapshot em `job.contract` e `job.material`.
3. `POST /api/admin/print-jobs/{id}/complete` recebe `claimToken`, um `eventId` unico e `artifacts`.
4. Em erro, `POST /api/admin/print-jobs/{id}/fail` recebe `claimToken`, `eventId`, `error` e `retryAfterSeconds` opcional.

`eventId` torna callbacks repetidos idempotentes. O token do lease e armazenado apenas como hash; lease expirado pode ser retomado por outro worker enquanto houver tentativas. Se a ultima tentativa expirar, o job vira `failed` com erro `print_job_lease_expired`. Falha retryable volta para `queued` enquanto houver tentativas.

Exemplo de artefato:

```json
{
  "type": "stl",
  "name": "ORDER-BF-260504-AB12-BF-RD-PI-22X28X18.stl",
  "uri": "s3://baseforma-print-artifacts/orders/BF-260504-AB12/model.stl",
  "checksum": "sha256:...",
  "sizeBytes": 482193
}
```

A URI e apenas registrada; o site nao presume filesystem compartilhado nem simula upload. O armazenamento definitivo, a hospedagem do worker CAD, o catalogo de materiais/lotes e a politica de retencao dos artefatos continuam decisoes de infraestrutura pendentes.

## Estados operacionais

Use apenas estes estados no trabalho diario:

- `Aguardando producao`: pedido pago aguardando o trabalho manual da operacao.
- `Produzido`: producao concluida, pedido pronto para seguir para expedicao.

## Expedicao

A expedicao tambem deve ficar simples:

- `Aguardando expedicao`: ainda sem despacho.
- `Pronto para expedir`: impressao concluida e pacote pronto para saida/coleta.
- `Expedido`: pedido saiu da operacao e deve ter rastreio ou registro de retirada.

Nota fiscal nao faz parte da fila de producao. O Mercado Pago resolve pagamento e a NF-e e emitida automaticamente via Focus NFe apos a aprovacao; a expedicao apenas confere numero, chave e DANFE registrados no pedido.

## Ordenacao

A fila usa a ordenacao de `lib/fulfillment.js`:

- prioridade operacional primeiro;
- depois data programada;
- depois data de criacao do pedido.

A capacidade diaria continua configurada por `PRODUCTION_DAILY_UNIT_CAPACITY`.

## Inputs de modelo

Cada item da fila pode ser expandido no admin para mostrar os inputs do modelo parametrico por produto comprado. Pedidos com mais de um tipo de produto devem listar um bloco de inputs por item, com SKU, familia/formato, quantidade e medidas.

## Notion

Uma integracao futura com Notion pode espelhar esta fila, mas o site deve continuar usando o pedido local/Postgres como fonte de verdade. O Notion deve ser tratado como painel operacional ou checklist, nao como substituto do armazenamento de pedidos.
