# Nota fiscal via Mercado Pago Sistema de Gestao

Este documento registra o fluxo fiscal de MVP enquanto `INVOICE_PROVIDER=mercado_pago_system`.

## Decisao atual

- O site nao emite NF-e/NFC-e/NFS-e automaticamente.
- O admin apenas guarda o controle operacional em `orders.metadata.fulfillment.invoice`.
- A emissao acontece fora do site, no Sistema de Gestao Mercado Pago.
- O Mercado Pago continua sendo pagamento e emissor operacional; isso nao muda o checkout proprio nem adiciona plataforma externa de loja.
- A documentacao publica do Mercado Pago descreve emissao pelo Sistema de Gestao, mas nao expõe endpoint publico de API para o site transmitir NF-e automaticamente.

## Campos guardados no pedido

O admin em `/admin/pedidos` e `/admin/operacao` salva:

- `status`: `pending`, `manual_pending`, `manual_issued`, `not_required` ou `cancelled`;
- `mode`: sempre `manual`;
- `number`: numero da nota;
- `series`: serie da nota;
- `accessKey`: chave de acesso com ate 44 digitos;
- `issuedAt`: data/hora de emissao;
- `notes`: observacoes fiscais e de expedicao.

Quando a NF e marcada como emitida sem numero, serie ou chave valida, o sistema preserva o salvamento e adiciona uma pendencia em `notes`. Isso evita bloquear a expedicao no MVP, mas deixa a conferencia visivel.

## Configuracao fiscal atual

- CNPJ emissor: `42.616.830/0001-98`.
- Documento: NF-e de produto.
- Natureza da operacao: venda de producao propria.
- NCM: `3926.30.00`.
- Origem: `0`.
- Ambiente: producao.
- Janela operacional de cancelamento: 7 dias apos o pagamento, respeitando o prazo legal/SEFAZ aplicavel.

O CFOP numerico deve ser confirmado por UF de destino e pela contabilidade. Para venda de producao propria, normalmente a decisao separa operacao interna e interestadual.

## Procedimento de lancamento

1. Confirme que o pagamento Mercado Pago esta aprovado.
2. Confira dados do cliente e endereco no pedido local.
3. Confira itens, quantidades, total de produtos, desconto, frete e total cobrado.
4. Emita a NF-e no Sistema de Gestao Mercado Pago.
5. Volte ao admin e marque `NF emitida no emissor`.
6. Preencha numero, serie, chave de acesso e data/hora de emissao.
7. Registre observacoes fiscais/expedicao quando houver excecao.
8. So avance a expedicao quando a NF estiver emitida ou quando a operacao declarar `NF nao requerida`.

## Pendencias para integracao externa

Antes de implementar emissao automatica por API, ainda falta:

- endpoint/API oficial do Mercado Pago para emissao, consulta e cancelamento de NF-e, se disponivel para esta conta;
- certificado digital A1 configurado no Mercado Pago;
- regime tributario, serie e regras de contingencia;
- CFOP numerico por cenario fiscal;
- regras de cancelamento, carta de correcao e armazenamento de XML/PDF;
- responsavel fiscal pela homologacao.
