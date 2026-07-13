# Fila de producao

Este documento registra a regra operacional da fila de producao usada no admin.

## Objetivo

Manter uma lista simples de pedidos pagos que aguardam producao. A preparacao de arquivos e feita manualmente pela operacao e nao bloqueia a fila.

## Entrada na fila

Um pedido entra na fila quando:

- foi criado no checkout proprio;
- tem pagamento aprovado pelo Mercado Pago;
- nao esta cancelado;
- ainda nao foi expedido.

Pedidos criados sem pagamento continuam visiveis no filtro `Pagamento`, mas nao devem ocupar posicao na fila. Revisoes tecnicas excepcionais continuam como bloqueio separado quando a configuracao do pedido for invalida.

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
