# Tags de anuncio (Google Ads e Meta Pixel)

Este documento cobre as tags de conversao e remarketing usadas no trafego pago e o passo a
passo nos paineis. A medicao de audiencia (GA4) esta em `docs/ops/analytics.md`; a regra
geral de scripts opcionais esta em `docs/ops/privacy-cookies.md`. O plano de campanhas fica
em `docs/marketing/paid-traffic-launch.md`.

## Como funciona no codigo

| Peca | Papel |
| --- | --- |
| `lib/ads-config.js` | Le `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL`, `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` e `NEXT_PUBLIC_META_PIXEL_ID`, valida o formato e informa se ha alguma tag ligada. |
| `lib/ads.js` | Gate (aceite `marketing`, rotas excluidas, demonstracao), fila ate o carregador decidir, traducao dos eventos GA4 para Google Ads/Meta, registro de compras ja enviadas, limpeza de cookies na revogacao. |
| `components/ads-loader.jsx` | Montado no `app/layout.js`. Carrega a tag do Google Ads (via `lib/gtag-runtime.js`, compartilhado com o GA4) e o Meta Pixel somente com a categoria `marketing` aceita. |
| `lib/analytics.js` | As funcoes `track*` continuam sendo o unico ponto de chamada; cada uma envia ao GA4 (aceite `analytics`) e repassa a `lib/ads.js` (aceite `marketing`). |

Regras aplicadas:

- **Sem nenhuma variavel**: nada e renderizado, a revisao do aviso nao muda e a categoria
  "Publicidade" nao aparece.
- **Aceite proprio**: medicao e publicidade sao finalidades separadas. O aviso oferece
  "Aceitar todos", "Recusar opcionais" (mesmo peso visual) e "Escolher por finalidade".
  Ligar qualquer tag muda a revisao do inventario (`ads-1`, ou `ga4-1+ads-1` com o GA4) e
  todo mundo responde de novo.
- **Consent Mode v2, modo basico**: `ad_storage`, `ad_user_data` e `ad_personalization`
  ficam `denied` por padrao e viram `granted` apenas com o aceite de `marketing`. A tag do
  Google Ads so recebe `config` depois do aceite: nao ha pings sem consentimento.
- **Sem dados pessoais**: nao ha enhanced conversions nem correspondencia avancada. O Meta
  Pixel roda com `autoConfig` desligado (sem captura automatica de botoes/formularios) e
  `disablePushState` (o site envia o PageView de cada rota).
- **URL**: as tags recebem apenas `utm_*`, `formato` e os cliques `gclid`, `gbraid`,
  `wbraid` e `fbclid`. Na confirmacao do pedido, `components/order-confirmation.jsx` remove
  da barra de endereco o id do pedido e os parametros do Mercado Pago (`payment_id`,
  `collection_id`, `external_reference` etc.) antes de qualquer tag ler a pagina; o id do
  pedido fica so na sessao da aba.
- **Clique antes do aceite**: a URL de entrada fica em memoria (nada e gravado antes do
  aceite). Se o visitante aceitar depois de navegar, o Google Ads recebe o `gclid` da entrada
  em `page_location` e o `_fbc` do Meta e recriado a partir do `fbclid` da entrada. O
  configurador preserva `utm_*` e cliques ao trocar de formato.
- **GA4**: continua sem Google Signals e sem sinais de anuncio. Com o aceite de `marketing`,
  o `page_location` enviado ao GA4 passa a manter o `gclid` (necessario se o GA4 for
  vinculado ao Google Ads).
- **Revogacao**: consent update `denied`, `fbq('consent', 'revoke')`, remocao de `_gcl_*`,
  `_fbp`, `_fbc` e do registro `baseforma-ads-purchases`.
- **Rotas excluidas e demonstracao**: iguais as do GA4 (`/admin`, `/demonstracao`, `/api`,
  `?demo=1`, sessao demo).

### Eventos

| Evento do site | Google Ads | Meta Pixel |
| --- | --- | --- |
| `page_view` (cada rota) | `page_view` (remarketing) | `PageView` |
| `view_item` | - | `ViewContent` |
| `add_to_cart` | - | `AddToCart` |
| `begin_checkout` | - | `InitiateCheckout` (`num_items`) |
| `add_payment_info` | - | `AddPaymentInfo` |
| `purchase` | `conversion` com `send_to: AW-.../<rotulo de compra>`, `value`, `currency`, `transaction_id` | `Purchase` com `eventID: purchase-<numero do pedido>` |
| `generate_lead` | `conversion` com o rotulo de lead, se configurado | `Lead` |

`value` = produtos menos desconto, sem frete, em BRL. `transaction_id` = numero publico do
pedido (`BF-...`). `content_ids` = `<categoria>/<formato>`. A compra so conta com pagamento
aprovado no retorno do Mercado Pago (mesma regra do GA4) e e deduplicada por pedido em
`baseforma-ads-purchases`, separado do registro do GA4.

**Limitacao conhecida:** Pix/boleto aprovado depois que o cliente fechou a aba nao chega ao
navegador. A compensacao e a importacao de conversoes offline a partir dos pedidos (ver
`docs/marketing/paid-traffic-launch.md`).

## Passo a passo no Google Ads

1. **Conversao de compra**: Metas > Conversoes > Nova acao de conversao > Site > configurar
   manualmente. Categoria "Compra", valor "Usar valores diferentes para cada conversao"
   (padrao R$ 0), contagem "Todas", janela de clique 30 dias, atribuicao "Baseada em dados".
   Em "Configurar a tag" escolha "Usar o Google Tag Manager"/"Instalar manualmente" e copie
   o `send_to`: `AW-XXXXXXXXX/YYYYYYYYYYY`. O trecho antes da barra e o ID; o depois, o
   rotulo.
2. **(Opcional) Conversao de lead**: mesma tela, categoria "Envio de formulario de lead",
   contagem "Uma". Marque como **secundaria** (o formulario de projeto especial abre o
   e-mail do cliente; nao e um lead confirmado).
3. **So uma compra primaria**: se o GA4 for vinculado ao Google Ads, nao importe o
   `purchase` do GA4 como primario, senao cada venda conta duas vezes. Mantenha a tag nativa
   como primaria.
4. **Auto-tagging**: Administrador > Configuracoes da conta > Codificacao automatica ligada
   (gera o `gclid`).
5. **Enhanced conversions**: deixe desligado. O site nao envia dados fornecidos pelo usuario.
6. **Vercel**: Project `site-sapatas` > Settings > Environment Variables, ambiente
   **Production**:
   - `NEXT_PUBLIC_GOOGLE_ADS_ID` = `AW-XXXXXXXXX`
   - `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` = rotulo da compra
   - `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` = rotulo do lead (opcional)
   Refaca o deploy de `main`. No PowerShell nao use pipe para `vercel env add` (grava BOM);
   prefira o painel web.

## Passo a passo no Meta (Facebook/Instagram)

1. **Pixel**: Gerenciador de Eventos > Conectar fontes de dados > Web > Meta Pixel. Copie o
   ID numerico.
2. **Desligar correspondencia avancada automatica**: Gerenciador de Eventos > pixel >
   Configuracoes > "Correspondencia avancada automatica" **desligada**. O codigo nao envia
   dados pessoais, mas essa opcao do painel captura campos de formulario por conta propria.
3. **Configuracao automatica de eventos**: o codigo usa `autoConfig: false`; em
   Configuracoes, deixe "Rastrear eventos automaticamente sem codigo" desligado.
4. **Verificar o dominio** por DNS: Configuracoes do negocio > Seguranca da marca > Dominios
   > Adicionar `baseforma.com.br` > registro TXT. Crie o TXT na zona DNS do Registro.br
   (modo avancado) e confirme no painel.
5. **Eventos da web (Aggregated Event Measurement)**: depois da verificacao, priorize
   `Purchase` em primeiro, depois `InitiateCheckout`, `AddToCart`, `ViewContent`, `Lead`.
6. **Vercel**: `NEXT_PUBLIC_META_PIXEL_ID` = ID numerico, ambiente **Production**, e novo
   deploy de `main`.

## Validacao antes de investir

Em aba anonima, com o deploy de producao:

1. Sem escolha ou com "Recusar opcionais": a aba Rede nao tem `googletagmanager.com`,
   `googleadservices.com`, `google.com/pagead`, `connect.facebook.net` nem `facebook.com/tr`.
2. "Escolher por finalidade" com so Medicao: aparece o GA4, nenhuma tag de anuncio.
3. Abra `https://www.baseforma.com.br/?gclid=teste123&fbclid=teste456&utm_source=google`,
   navegue para uma familia e so depois aceite Publicidade: no Tag Assistant o Google Ads
   recebe `page_location` com `gclid=teste123`; o cookie `_fbc` termina em `.teste456`.
4. Meta Pixel Helper mostra `PageView` uma vez por rota; `AddToCart` ao adicionar ao
   carrinho; `InitiateCheckout` ao focar o checkout.
5. Pedido real aprovado (cartao): no retorno, a URL fica `/pedido-confirmado?payment=success`
   sem `payment_id`; o Tag Assistant mostra a conversao com `transaction_id` = numero do
   pedido e o Pixel Helper mostra `Purchase` com o mesmo numero no `eventID`. Recarregar a
   pagina nao repete a conversao.
6. Revogar no rodape: `_gcl_*`, `_fbp` e `_fbc` somem e nenhum novo request sai.
7. `/admin` e a sessao demo nao disparam nenhuma tag.

## Verificacao local

```bash
node --test test/ads.test.js test/analytics.test.js test/cookie-consent.test.js
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-123456789 NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL=teste123 NEXT_PUBLIC_META_PIXEL_ID=1234567890123456 npm run build
```
