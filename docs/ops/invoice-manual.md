# Nota fiscal automatizada por API (Focus NFe)

Este documento registra o fluxo fiscal com `INVOICE_PROVIDER=focus_nfe`: a emissao da NF-e e automatica, disparada pelo pagamento aprovado.

## Decisao atual

- A emissao de NF-e e **automatizada por API** via Focus NFe (`lib/invoice-provider.js`).
- O Mercado Pago segue como pagamento; ele **nao possui API publica de emissao de NF-e**, por isso a automacao usa um emissor fiscal dedicado.
- O checkout exige CPF/CNPJ do cliente (validado no servidor) porque a NF-e exige documento do destinatario.
- O admin guarda o espelho operacional em `orders.metadata.fulfillment.invoice` (status, numero, serie, chave, DANFE).

## Fluxo automatico

1. Webhook do Mercado Pago confirma pagamento aprovado.
2. `requestInvoiceAfterPayment` monta o payload da NF-e (destinatario, itens com NCM/CFOP/CSOSN, frete, desconto, totais) e envia `POST /v2/nfe?ref={orderId}` para a Focus NFe.
3. Resposta `processando_autorizacao` deixa a NF como `api_pending`; `autorizado` grava numero, serie, chave de acesso e link do DANFE (`api_issued`).
4. Quando a SEFAZ conclui o processamento, a Focus NFe notifica `POST /api/webhooks/focus-nfe` (gancho autenticado por `FOCUS_NFE_WEBHOOK_TOKEN`); o endpoint reconsulta `GET /v2/nfe/{ref}` e atualiza o pedido automaticamente. O botao "Atualizar status da NF" no admin continua disponivel como fallback manual.
5. `erro_autorizacao`/`denegado` marcam `api_failed` com a mensagem da SEFAZ nas notas; o botao "Emitir NF" permite reenviar apos correcao.

### Registro do gancho (uma vez por ambiente)

```bash
curl -u "$FOCUS_NFE_TOKEN:" -X POST https://api.focusnfe.com.br/v2/hooks \
  -H "Content-Type: application/json" \
  -d '{"cnpj":"42616830000198","event":"nfe","url":"https://www.baseforma.com.br/api/webhooks/focus-nfe","authorization":"<FOCUS_NFE_WEBHOOK_TOKEN>"}'
```

Em homologacao, use `https://homologacao.focusnfe.com.br/v2/hooks` com o token de homologacao.

## Configuracao

- `FOCUS_NFE_TOKEN`: token da empresa no painel Focus NFe (homologacao e producao tem tokens distintos).
- `FOCUS_NFE_ENV`: `homologacao` (padrao) ou `producao`.
- `FOCUS_NFE_WEBHOOK_TOKEN`: segredo compartilhado validado no header `Authorization` das notificacoes do gancho.
- `INVOICE_ISSUER_CNPJ` / `INVOICE_ISSUER_UF`: emissor (CNPJ `42.616.830/0001-98`, SP).
- CFOP automatico por UF de destino: `INVOICE_CFOP_INTRASTATE=5101`, `INVOICE_CFOP_INTERSTATE=6107` (ou `INVOICE_CFOP` fixo).
- NCM `3926.30.00`, origem `0`, CSOSN `102`, PIS/COFINS CST `49` (Simples Nacional; confirmar com contabilidade).

## Pre-requisitos externos (fora do codigo)

1. Conta na Focus NFe com a empresa cadastrada (CNPJ emissor).
2. Certificado digital A1 valido enviado ao painel Focus NFe.
3. Inscricao estadual e credenciamento de NF-e na SEFAZ.
4. Homologacao: emitir notas de teste com `FOCUS_NFE_ENV=homologacao` e validar dados com a contabilidade antes de virar `producao`.

## Contingencia manual

Se a API estiver indisponivel ou a nota falhar, o formulario de NF do admin continua aceitando registro manual (status "NF emitida no emissor", numero, serie, chave de 44 digitos e data). Pedidos sem CPF/CNPJ (anteriores a esta versao) ficam `api_pending` com aviso ate o documento ser completado.

## Cancelamento

Janela operacional de `INVOICE_CANCEL_WINDOW_DAYS` (7 dias), respeitando o prazo legal da SEFAZ. Para notas `api_issued` dentro da janela, o admin tem o botao "Cancelar NF-e na SEFAZ" (exige justificativa de 15 a 255 caracteres, enviada via `DELETE /v2/nfe/{ref}`); o pedido e atualizado para `NF cancelada` automaticamente. Fora da janela ou em caso de falha, use o painel Focus NFe e marque `NF cancelada` manualmente no admin.
