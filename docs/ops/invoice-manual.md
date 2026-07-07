# Nota fiscal via Mercado Pago Sistema de Gestao

Este documento registra o fluxo fiscal operacional enquanto o endpoint fiscal Mercado Pago (`MERCADO_PAGO_INVOICE_API_URL`) nao estiver liberado/configurado para a conta.

## Decisao atual

- `INVOICE_PROVIDER=mercado_pago`: pagamento aprovado aciona `lib/invoice-provider.js`.
- Sem `MERCADO_PAGO_INVOICE_API_URL`, o pedido fica com NF via API pendente (`api_pending`) e nenhuma emissao automatica acontece.
- Enquanto isso, a emissao acontece fora do site, no Sistema de Gestao Mercado Pago, e o admin guarda o controle operacional em `orders.metadata.fulfillment.invoice`.
- O Mercado Pago continua sendo pagamento e emissor operacional; isso nao muda o checkout proprio nem adiciona plataforma externa de loja.
- Quando o endpoint fiscal for liberado, a emissao passa a ser automatica pela API e este procedimento vira contingencia.

## Campos guardados no pedido

O admin em `/admin/pedidos` e `/admin/operacao` salva:

- `status`: `pending`, `manual_pending`, `manual_issued`, `api_pending`, `api_issued`, `api_failed`, `not_required` ou `cancelled`;
- `mode` e `provider`: origem do registro (`manual` ou `mercado_pago`);
- `number`: numero da nota;
- `series`: serie da nota;
- `accessKey`: chave de acesso com ate 44 digitos (somente numeros);
- `documentUrl`: URL do documento/DANFE quando houver;
- `issuedAt`: data/hora de emissao;
- `notes`: observacoes fiscais e de expedicao.

Quando a NF e marcada como emitida sem numero, serie ou chave valida, o sistema preserva o salvamento e adiciona uma pendencia em `notes`. Isso evita bloquear a expedicao no MVP, mas deixa a conferencia visivel.

## Configuracao fiscal de referencia

Exibida no checklist do admin via `lib/invoice-config.js`:

- CNPJ emissor: `42.616.830/0001-98` (`INVOICE_ISSUER_CNPJ`).
- Documento: NF-e de produto (`INVOICE_DOCUMENT_MODEL=nfe`).
- Natureza da operacao: venda de producao propria (`INVOICE_OPERATION_NATURE`).
- NCM: `3926.30.00` (`INVOICE_NCM`).
- Origem: `0` (`INVOICE_PRODUCT_ORIGIN`).
- Ambiente: producao (`INVOICE_ENV`).
- Janela operacional de cancelamento: 7 dias apos o pagamento (`INVOICE_CANCEL_WINDOW_DAYS`), respeitando o prazo legal/SEFAZ aplicavel.

O CFOP numerico (`INVOICE_CFOP`) deve ser confirmado por UF de destino e pela contabilidade. Para venda de producao propria, normalmente a decisao separa operacao interna e interestadual.

## Procedimento de lancamento

1. Confirme que o pagamento Mercado Pago esta aprovado.
2. Confira dados do cliente e endereco no pedido local.
3. Confira itens, quantidades, total de produtos, desconto, frete e total cobrado.
4. Emita a NF-e no Sistema de Gestao Mercado Pago.
5. Volte ao admin e marque `NF Mercado Pago emitida`.
6. Preencha numero, serie, chave de acesso e data/hora de emissao.
7. Registre observacoes fiscais/expedicao quando houver excecao.
8. So avance a expedicao quando a NF estiver emitida ou quando a operacao declarar `NF nao requerida`.

## Pendencias para emissao automatica por API

Antes de ativar a emissao automatica, ainda falta:

- endpoint/API fiscal oficial do Mercado Pago liberado para esta conta (`MERCADO_PAGO_INVOICE_API_URL` e token);
- certificado digital A1 configurado no Mercado Pago;
- regime tributario, serie e regras de contingencia;
- CFOP numerico por cenario fiscal;
- regras de cancelamento, carta de correcao e armazenamento de XML/PDF;
- responsavel fiscal pela homologacao.
