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

- `Aguardando`: pedido pago na fila, ainda sem impressao iniciada.
- `Imprimindo`: producao em andamento na mesa/impressora definida.
- `Pronto para expedir`: impressao finalizada, pedido pronto para nota fiscal manual e expedicao.

## Expedicao

A expedicao tambem deve ficar simples:

- `Aguardando expedicao`: ainda sem despacho.
- `Pronto para expedir`: impressao concluida e pacote pronto para saida/coleta.
- `Expedido`: pedido saiu da operacao e deve ter rastreio ou registro de retirada.

Nota fiscal nao faz parte da fila de impressao. O Mercado Pago resolve pagamento, mas a emissao fiscal continua fora dele no fluxo atual; enquanto nao houver fornecedor fiscal integrado, mantenha `INVOICE_PROVIDER=manual` e trate NF na etapa de expedicao/fechamento operacional.

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
