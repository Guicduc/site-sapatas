# Fila de impressao

Este documento registra a regra operacional da fila de impressao usada no admin.

## Objetivo

Manter uma lista simples de pedidos pagos que precisam ser impressos, sem tratar CAD como uma etapa manual separada. A geracao de modelos faz parte da operacao e deve ser automatizada pelo fluxo interno.

## Entrada na fila

Um pedido entra na fila quando:

- foi criado no checkout proprio;
- tem pagamento aprovado pelo Mercado Pago;
- nao esta cancelado;
- ainda nao foi expedido.

Pedidos criados sem pagamento continuam visiveis no filtro `Pagamento`, mas nao devem ocupar posicao na fila de impressao.

## Estados operacionais

Use apenas estes estados no trabalho diario:

- `Registrado na fila`: pedido pago, pronto para ser considerado na ordem de impressao.
- `Aguardando`: pedido pago com alguma pendencia operacional antes de concluir a impressao.
- `Concluida`: impressao finalizada, pedido pronto para nota fiscal manual e expedicao.

## Expedicao

A expedicao tambem deve ficar simples:

- `Aguardando expedicao`: ainda sem despacho.
- `Pronto para expedir`: impressao concluida e pacote pronto para saida/coleta.
- `Expedido`: pedido saiu da operacao e deve ter rastreio ou registro de retirada.

## Ordenacao

A fila usa a ordenacao de `lib/fulfillment.js`:

- prioridade operacional primeiro;
- depois data programada;
- depois data de criacao do pedido.

A capacidade diaria continua configurada por `PRODUCTION_DAILY_UNIT_CAPACITY`.

## Notion

Uma integracao futura com Notion pode espelhar esta fila, mas o site deve continuar usando o pedido local/Postgres como fonte de verdade. O Notion deve ser tratado como painel operacional ou checklist, nao como substituto do armazenamento de pedidos.
