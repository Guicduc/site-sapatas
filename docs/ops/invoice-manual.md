# Nota fiscal manual e automacao Focus NFe pausada

A operacao atual emite a NF-e manualmente no emissor e registra o resultado no admin. A integracao `INVOICE_PROVIDER=focus_nfe` permanece implementada para um religamento futuro.

## Pausa temporaria (estado atual)

A emissao automatica esta **pausada**. A automacao so roda quando `INVOICE_AUTOMATION_ENABLED=true`; sem essa variavel, `getInvoiceConfig()` trata o provider efetivo como `manual` e preserva `INVOICE_PROVIDER`, tokens e webhook para o religamento.

Enquanto a pausa durar:

1. O webhook do Mercado Pago continua enfileirando o evento fiscal (`focus_nfe_invoice`) na mesma transacao do pagamento. O processador nao chama a Focus NFe: ele registra a NF do pedido como `manual_pending` ("NF pendente no emissor") com a nota "Emissao automatica via Focus NFe pausada".
2. Em `/admin/pedidos?fila=notafiscal` ("NF a emitir") ficam todos os pedidos pagos, nao cancelados e sem revisao de pagamento cuja NF ainda nao foi emitida, cancelada ou marcada como nao requerida. O resumo do admin mostra o total.
3. Cada pedido da fila mostra "Dados para emissao manual da NF-e": destinatario, CPF/CNPJ, endereco, CFOP/NCM/CSOSN, itens com desconto rateado, frete e total, calculados pelo mesmo montador do payload fiscal (nada e enviado a API). O botao "Copiar dados fiscais (JSON)" copia o conjunto completo. Se faltar dado (ex.: pedido sem CPF/CNPJ), a ficha mostra o motivo.
4. Antes de emitir manualmente um pedido com tentativa automatica anterior, a operacao consulta a referencia do pedido no painel Focus NFe. Uma solicitacao aceita antes da pausa ainda pode ser autorizada depois dela, sem atualizar o site. Se a nota ja estiver autorizada, registre a existente; se estiver processando, aguarde a resolucao. Emita outra nota apenas depois de confirmar que nao existe NF-e autorizada ou em processamento para a compra. Registre no formulario "Operacao": status "NF emitida no emissor", numero, serie, chave de 44 digitos e data. O pedido sai da fila.
5. Notificacoes antigas da Focus em `/api/webhooks/focus-nfe` recebem `200` com `ignored: invoice_automation_paused`, para nao gerar reenvio infinito.
6. O health check (`/api/integrations/health`) mostra `manual:focus_nfe_pausado`, e `npm run invoice:audit` marca `automation_enabled` para confirmacao.

Ao publicar a pausa, conferir no painel do emissor todas as tentativas automaticas ainda `api_pending` ou `api_failed`, inclusive falhas de timeout. A pausa nao cancela solicitacoes ja recebidas pela Focus NFe. Consulta e cancelamento pela API do site tambem ficam indisponiveis, portanto a reconciliacao e feita no painel.

### Religar a emissao automatica

1. Rodar `npm run invoice:audit` com as credenciais de homologacao. A auditoria consulta certificado e gancho mesmo com a automacao pausada; `automation_enabled: null` apenas informa a pausa. Habilitar `INVOICE_AUTOMATION_ENABLED=true` em ambiente isolado de homologacao e conferir uma emissao completa com `FOCUS_NFE_ENV=homologacao`.
2. Depois da homologacao e da validacao fiscal, configurar token e `FOCUS_NFE_ENV=producao` no ambiente produtivo, definir `INVOICE_AUTOMATION_ENABLED=true` e publicar.
3. Pedidos que ficaram em `manual_pending` nao sao reenviados sozinhos: emita manualmente ou use "Emitir NF via Focus NFe" no admin pedido a pedido.

## Decisao atual

- A emissao de NF-e e manual durante a pausa autorizada. A automacao Focus NFe em `lib/invoice-provider.js` so pode ser religada apos homologacao e decisao explicita.
- O Mercado Pago segue como pagamento; ele **nao possui API publica de emissao de NF-e**, por isso a automacao usa um emissor fiscal dedicado.
- O checkout exige CPF/CNPJ do cliente (validado no servidor) porque a NF-e exige documento do destinatario.
- O admin guarda o espelho operacional em `orders.metadata.fulfillment.invoice` (status, numero, serie, chave, DANFE).

## Fluxo automatico quando religado

1. Webhook do Mercado Pago confirma pagamento e enfileira `focus_nfe_invoice` na mesma transacao.
2. O processador da fila chama `requestInvoiceAfterPayment`, que monta o payload da NF-e (destinatario, itens com NCM/CFOP/CSOSN, frete, desconto rateado e totais) e envia `POST /v2/nfe?ref={referenciaAlfanumerica}` para a Focus NFe. A referencia e derivada de forma estavel do UUID do pedido porque a Focus nao aceita caracteres especiais.
3. Resposta `processando_autorizacao` deixa a NF como `api_pending`; `autorizado` grava numero, serie, chave de acesso e link do DANFE (`api_issued`).
4. Quando a SEFAZ conclui o processamento, a Focus NFe notifica `POST /api/webhooks/focus-nfe` (gancho autenticado por `FOCUS_NFE_WEBHOOK_TOKEN`); o endpoint reconsulta `GET /v2/nfe/{ref}` e atualiza o pedido automaticamente. O botao "Atualizar status da NF" no admin continua disponivel como fallback manual.
5. `erro_autorizacao`/`denegado` marcam `api_failed` com a mensagem da SEFAZ nas notas; o botao "Emitir NF" permite reenviar apos correcao.

Falhas do processador ficam visiveis em `/api/admin/outbox` e seguem a politica
de lease/retry de `docs/ops/post-payment-outbox.md`. O modo padrao `inline` espera
a tentativa de envio apos o commit. Somente o modo `async`, com processador
agendado homologado, responde sem aguardar a Focus NFe.

### Registro do gancho (uma vez por ambiente)

```bash
curl -u "$FOCUS_NFE_TOKEN:" -X POST https://api.focusnfe.com.br/v2/hooks \
  -H "Content-Type: application/json" \
  -d '{"cnpj":"42616830000198","event":"nfe","url":"https://www.baseforma.com.br/api/webhooks/focus-nfe","authorization":"<FOCUS_NFE_WEBHOOK_TOKEN>","authorization_header":"Authorization"}'
```

Em homologacao, use `https://homologacao.focusnfe.com.br/v2/hooks` com o token de homologacao.

## Configuracao

- `INVOICE_AUTOMATION_ENABLED=false`: padrao atual. `true` reativa o provider configurado e suas chamadas fiscais.
- `FOCUS_NFE_TOKEN`: token da empresa no painel Focus NFe (homologacao e producao tem tokens distintos).
- `FOCUS_NFE_ENV`: `homologacao` (padrao) ou `producao`.
- `FOCUS_NFE_WEBHOOK_TOKEN`: segredo compartilhado validado no header `Authorization` das notificacoes do gancho.
- `INVOICE_ISSUER_CNPJ` / `INVOICE_ISSUER_UF`: emissor (CNPJ `42.616.830/0001-98`, SP).
- CFOP automatico por UF de destino: `INVOICE_CFOP_INTRASTATE=5101`, `INVOICE_CFOP_INTERSTATE=6107` (ou `INVOICE_CFOP` fixo).
- NCM `3926.30.00`, origem `0`, CSOSN `102`, PIS/COFINS CST `49` e aliquotas em `INVOICE_PIS_RATE_PERCENT`/`INVOICE_COFINS_RATE_PERCENT` (padrao `0`; confirmar toda a tributacao com a contabilidade).

## Auditoria segura da conta e do gancho

Com as variaveis do ambiente desejado carregadas no processo, rode:

```bash
npm run invoice:audit
```

O comando confirma provider, ambiente, autenticacao e gancho `nfe`, sem imprimir tokens nem o corpo fiscal bruto. Ele tambem tenta consultar cadastro, habilitacao e certificado; tokens de empresa podem receber `404` em `/v2/empresas`, caso em que o resultado marca essa etapa para confirmacao no painel e na emissao de homologacao. Variaveis marcadas como `Sensitive` no Vercel nao sao devolvidas por `env pull`/`env run`; execute a auditoria em um processo local controlado enquanto tiver os valores em memoria, sem rebaixar a protecao dos segredos.

## Pre-requisitos externos (fora do codigo)

1. Conta na Focus NFe com a empresa cadastrada (CNPJ emissor).
2. Certificado digital A1 valido enviado ao painel Focus NFe; a posse local do arquivo nao basta.
3. Inscricao estadual e credenciamento de NF-e na SEFAZ.
4. Homologacao: emitir notas de teste com `FOCUS_NFE_ENV=homologacao` e validar dados com a contabilidade antes de virar `producao`.

## Contingencia manual

Enquanto a automacao estiver pausada, este e o fluxo normal. Depois do religamento, se a API estiver indisponivel ou a nota falhar, o formulario de NF do admin continua aceitando registro manual (status "NF emitida no emissor", numero, serie, chave de 44 digitos e data). Com a automacao ativa, pedidos sem CPF/CNPJ (anteriores a esta versao) ficam `api_pending` com aviso ate o documento ser completado.

## Cancelamento

Por padrao, `INVOICE_CANCEL_WINDOW_DAYS=1`, o limite conservador usual para NF-e. Alguns estados podem admitir regras diferentes: aumente essa janela somente apos validacao com a contabilidade para a UF emissora. Com a automacao ativa, para notas `api_issued` dentro da janela, o admin tem o botao "Cancelar NF-e na SEFAZ" (exige justificativa de 15 a 255 caracteres, enviada via `DELETE /v2/nfe/{ref}`); o pedido e atualizado para `NF cancelada` automaticamente. Durante a pausa, fora da janela ou em caso de falha, use o painel Focus NFe e marque `NF cancelada` manualmente no admin.
