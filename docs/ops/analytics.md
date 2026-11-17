# Google Analytics 4 (medicao opcional com consentimento)

Este documento cobre a implementacao do GA4 no site e o passo a passo que precisa ser feito
no painel do Google Analytics. A regra geral para scripts opcionais esta em
`docs/ops/privacy-cookies.md`.

## Como funciona no codigo

| Peca | Papel |
| --- | --- |
| `lib/analytics-config.js` | Le `NEXT_PUBLIC_GA_MEASUREMENT_ID`, define a revisao do inventario (`base` ou `ga4-1`), rotas excluidas e nomes de cookies. |
| `components/analytics-loader.jsx` | Montado no `app/layout.js`. Injeta `gtag.js` somente com ID + consentimento `analytics` + fora de `/admin`/demonstracao. Reage a `baseforma:cookie-consent-changed` e ao evento `storage` (outras abas). |
| `lib/analytics.js` | Modulo unico de eventos. Toda funcao vira no-op sem ID, sem consentimento, em rota excluida, com `?demo=1`/`?demonstracao` na URL ou com o runtime bloqueado (sessao demo). |

Regras aplicadas:

- **Sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`**: nada e renderizado, nenhum request ao Google; banner e
  `/privacidade` mantem o texto "sem medicao". Escolhas antigas continuam validas.
- **Consent Mode v2, modo basico**: o script so existe depois do aceite. `ad_storage`,
  `ad_user_data` e `ad_personalization` ficam sempre `denied`; `analytics_storage` vira
  `granted` apos o aceite e `denied` na revogacao.
- **Revogacao**: `window['ga-disable-<ID>'] = true` (opt-out oficial do gtag), consent update
  `denied`, remocao de `_ga`/`_ga_<ID>` em todos os dominios possiveis e do registro local de
  compras (`baseforma-analytics-purchases`).
- **Revisao do consentimento**: com o GA configurado, a revisao passa de `base` para `ga4-1`
  e todo mundo que ja respondeu ao banner e perguntado de novo.
- **Sem Google Signals / sem anuncios**: `allow_google_signals: false`,
  `allow_ad_personalization_signals: false`, `ads_data_redaction`. O GA4 nao registra nem
  armazena IP completo (anonimizacao e nativa; nao existe `anonymize_ip` no GA4).
- **Cookies**: `cookie_expires` de ~13 meses, `SameSite=Lax;Secure` em HTTPS.
- **Sem PII**: payloads montados por allowlist; filtro defensivo descarta chaves como
  `email`/`name`/`cpf`/`address` e valores com formato de e-mail, CPF, CNPJ ou telefone.
- **URLs**: `page_location` mantem apenas `utm_*` e `formato`. Todos os demais parametros
  (ex.: `orderId`, `payment`, `collection_id`, `payment_id`, `external_reference`,
  `preference_id` do retorno do Mercado Pago, `pedido` em `/conta`) sao removidos.
  `page_referrer` vira origem + caminho, sem query.
- **Page views**: enviados manualmente a cada troca de rota (`send_page_view: false`).
- **Demonstracao**: o carregador consulta `/api/demo-session`; sessao demo (ou falha na consulta)
  bloqueia tudo. Pedidos `demo` nunca geram `purchase`.

### Eventos

| Evento | Onde | Observacao |
| --- | --- | --- |
| `page_view` | `components/analytics-loader.jsx` | a cada rota, URL saneada |
| `view_item` | `components/product-configurator.jsx` | ao abrir/trocar formato; preco da configuracao inicial |
| `add_to_cart` | `components/product-configurator.jsx` | ao adicionar ao carrinho |
| `view_cart` | `components/cart-page.jsx` | uma vez por visita ao carrinho com itens |
| `begin_checkout` | `components/cart-page.jsx` | primeiro foco no formulario de checkout |
| `add_shipping_info` | `components/cart-page.jsx` | cotacao de frete valida (uma vez por cotacao), `shipping_tier` = servico |
| `add_payment_info` | `components/cart-page.jsx` | antes do redirecionamento ao Mercado Pago, `payment_type: mercado_pago` |
| `purchase` | `components/order-confirmation.jsx` | **somente** `paymentStatus === "approved"`, sem boleto pendente, sem demo; deduplicado por pedido em localStorage e pelo `transaction_id` |
| `generate_lead` | `components/special-request-builder.jsx` | envio do formulario de projeto especial (`lead_source: projeto_especial`) |

Parametros: `currency: "BRL"`, `value` (itens - desconto, sem frete), `items[]` com
`item_id` (`<categoria>/<formato>`), `item_name`, `item_category`, `item_variant` (SKU da
configuracao), `price` (unitario), `quantity`, `index`. `purchase` tambem envia
`transaction_id` (numero publico do pedido), `shipping` e `coupon`. Cupons so sao enviados
quando aplicados e com formato publico (ex.: `TRACO10`); codigos privados/unicos nao saem.

Boleto/Pix pendente nao conta como `purchase` ao voltar do Mercado Pago. Se o pagamento for
aprovado depois e o cliente reabrir a confirmacao (botao "Atualizar status"), o `purchase` e
enviado nesse momento. Compras aprovadas sem retorno ao site nao sao medidas pelo navegador
(limitacao aceita; medicao server-side via Measurement Protocol ficaria para um PR futuro).

## Passo a passo no painel GA4 (feito pelo responsavel da conta)

1. **Criar a propriedade**: em <https://analytics.google.com>, Administrador > Criar >
   Propriedade. Fuso horario `(GMT-03:00) Sao Paulo`, moeda `Real brasileiro (R$)`.
2. **Criar o fluxo web**: Administrador > Fluxos de dados > Adicionar fluxo > Web, URL
   `https://www.baseforma.com.br`. Copie o **ID da metrica** (`G-XXXXXXXXXX`).
3. **Medicao otimizada** (engrenagem no fluxo): **desligue** "Mudancas de pagina com base no
   historico do navegador" (o site ja envia page_view saneado; deixar ligado duplicaria e
   enviaria a URL com query), "Pesquisa no site" e "Interacoes com formularios". Recomendado
   desligar tambem "Cliques de saida" (o link do boleto do Mercado Pago tem identificadores
   do pagamento). Pode manter rolagem, engajamento com video e downloads.
4. **Informar o ID na Vercel**: Project `site-sapatas` > Settings > Environment Variables >
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXXXXX`, ambiente **Production** apenas (deixe
   Preview/Development vazios para nao misturar trafego de teste). Refaca o deploy de `main`
   (variavel `NEXT_PUBLIC_*` e embutida no build). No PowerShell nao use pipe para
   `vercel env add` (grava BOM); prefira o painel web.
5. **Excluir referencias indesejadas**: Fluxo web > Configurar definicoes da tag > Mostrar
   tudo > Listar referencias indesejadas. Adicione (tipo "o dominio de referencia contem"):
   `mercadopago.com.br`, `mercadopago.com`, `mercadolivre.com.br`, `mercadolibre.com`,
   `mercadopago.com.ar` (se usar checkout internacional). Assim o retorno do pagamento nao
   abre nova sessao atribuida ao Mercado Pago.
6. **Marcar `purchase` como evento principal (conversao)**: Administrador > Eventos (ou
   "Eventos principais") > marcar `purchase`. Opcional: `generate_lead`.
   Os eventos aparecem depois do primeiro disparo real (ate 24 h).
7. **Filtro de trafego interno**: Fluxo web > Configurar definicoes da tag > Definir trafego
   interno > regra `internal` com o IP do escritorio/da operacao. Depois em Administrador >
   Configuracoes de dados > Filtros de dados, deixe o filtro "Internal Traffic" em **Teste**,
   valide no relatorio e mude para **Ativo**.
8. **Retencao de dados**: Administrador > Configuracoes de dados > Retencao de dados >
   "Retencao de dados de eventos" = **14 meses**; ative "Redefinir dados do usuario em nova
   atividade" conforme a politica desejada (recomendado: desligado para respeitar o limite).
9. **Vincular ao Search Console**: Administrador > Vinculos de produtos > Search Console >
   Vincular > escolha a propriedade `www.baseforma.com.br` (ja verificada por
   `GOOGLE_SITE_VERIFICATION`) e o fluxo web.
10. **Desativar Google Signals e compartilhamento para anuncios**: Administrador >
    Configuracoes de dados > Coleta de dados > Google Signals **desligado**; "Permitir sinais
    de personalizacao de anuncios" desligado para todas as regioes. Em Configuracoes da conta >
    Compartilhamento de dados, desmarque "Produtos e servicos do Google", "Especialistas
    tecnicos" e "Modelagem de contribuicoes" se nao forem necessarios. Nao vincule Google Ads.
11. **Granularidade de dados de local e dispositivo**: Configuracoes de dados > Coleta de dados
    > desligar "Coleta de dados granular de local e dispositivo" (minimiza dados).
12. **Validar**: abra o site em aba anonima, aceite os opcionais, navegue ate o carrinho e use
    Administrador > DebugView (com a extensao Tag Assistant) ou Relatorios > Tempo real. Recuse
    em outra aba anonima e confirme que nao ha requests a `googletagmanager.com` nem
    `google-analytics.com`.

## Verificacao local

```bash
npm test
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST000000 npm run build
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST000000 npm start
```

- Sem escolha/recusa: o HTML e a aba Rede nao contem `googletagmanager.com`.
- Apos "Aceitar opcionais": aparece `<script data-baseforma-analytics="ga4" src="https://www.googletagmanager.com/gtag/js?id=G-TEST000000">`.
- Revogar no rodape: `window['ga-disable-G-TEST000000'] === true` e os cookies `_ga*` somem.
- Em `/admin` e na sessao demo o script nao e injetado.

Se a CSP de `next.config.mjs` passar a restringir `script-src`/`connect-src`, inclua
`https://www.googletagmanager.com` e `https://*.google-analytics.com`
(`https://*.analytics.google.com`) antes de ativar.
