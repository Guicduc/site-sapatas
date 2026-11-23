# Inventario de cookies e tecnologias semelhantes

Este documento registra o inventario tecnico verificado em 13/07/2026 e a regra operacional para novos scripts. A pagina publica correspondente fica em `/privacidade`.

## Estado atual

- Google Analytics 4 e **opcional e condicional**: so existe quando `NEXT_PUBLIC_GA_MEASUREMENT_ID` esta definido no build e so carrega apos o aceite da categoria `analytics`. Sem a variavel, nao ha nenhum script de medicao. Detalhes e passo a passo do painel em `docs/ops/analytics.md`.
- Tags de anuncio (Google Ads e Meta Pixel) sao **opcionais e condicionais**: so existem com `NEXT_PUBLIC_GOOGLE_ADS_ID` e/ou `NEXT_PUBLIC_META_PIXEL_ID` no build e so carregam apos o aceite da categoria `marketing` ("Publicidade"), separada de `analytics`. Detalhes em `docs/ops/ads-tracking.md`.
- Nao ha Google Tag Manager, mapas de calor, videos incorporados ou outros scripts remotos de marketing.
- `components/structured-data.jsx` gera apenas JSON-LD estatico. Ele nao executa codigo externo nem grava dados no navegador.
- A fonte declarada com `next/font` e servida pela propria aplicacao; nao ha requisicao do navegador ao Google Fonts.
- ViaCEP, Mercado Pago, Melhor Envio, Focus NFe e Resend sao integracoes funcionais chamadas pelo servidor ou destinos abertos por acao explicita do usuario. Nao sao scripts de rastreamento carregados nas paginas.

## Inventario

| Nome | Tecnologia | Finalidade | Criacao | Prazo |
| --- | --- | --- | --- | --- |
| `baseforma-admin` | cookie HttpOnly, SameSite=Lax, Secure em producao | sessao administrativa | login em `/admin` | 180 dias, renovados com o uso |
| `baseforma-account` | cookie HttpOnly, SameSite=Lax, Secure em producao, Priority=High | sessao da conta do cliente; token opaco, apenas hash persistido | confirmacao do codigo ou senha | 30 dias |
| `baseforma-order-access` | cookie HttpOnly, SameSite=Lax | acesso temporario ao pedido criado | `POST /api/orders` | 2 horas |
| `baseforma-cart` | localStorage | persistencia do carrinho | uso do configurador/carrinho | ate limpeza do navegador |
| `baseforma-cart-recovery` | localStorage | identificador e token do carrinho salvo | recuperacao de carrinho no checkout | ate conversao ou limpeza |
| `baseforma-last-order-id` | sessionStorage | reabertura da confirmacao do pedido | pedido criado | ate fechar a aba |
| `baseforma-cookie-consent` | localStorage | escolha e validade do consentimento | aviso/centro de preferencias | 180 dias |

Todas as tecnologias acima sao funcionais.

### Opcionais (somente com `NEXT_PUBLIC_GA_MEASUREMENT_ID` e aceite de `analytics`)

| Nome | Tecnologia | Fornecedor | Finalidade | Criacao | Prazo |
| --- | --- | --- | --- | --- | --- |
| `_ga` | cookie primario, SameSite=Lax, Secure em HTTPS | Google (Google Analytics 4) | identificador pseudonimo para medicao agregada de visitas e compras | apos aceitar opcionais | 13 meses |
| `_ga_<ID sem "G-">` | cookie primario, SameSite=Lax, Secure em HTTPS | Google (Google Analytics 4) | estado da sessao de medicao | apos aceitar opcionais | 13 meses |
| `baseforma-analytics-purchases` | localStorage | Baseforma | numeros de pedido ja medidos, para nao contar `purchase` duas vezes | primeira compra aprovada medida | ate revogar ou limpar |

A revogacao apaga os tres itens e ativa o opt-out `ga-disable-<ID>` do gtag. No GA4, Google Signals e sinais de personalizacao de anuncios ficam sempre desativados.

### Opcionais de publicidade (somente com a tag configurada e aceite de `marketing`)

| Nome | Tecnologia | Fornecedor | Finalidade | Criacao | Prazo |
| --- | --- | --- | --- | --- | --- |
| `_gcl_au`, `_gcl_aw`, `_gcl_gb` | cookies primarios | Google (Google Ads) | ligar o clique no anuncio a visita e a compra | apos aceitar Publicidade | 90 dias |
| `_fbp` | cookie primario | Meta (Meta Pixel) | identificador pseudonimo do navegador para medir anuncios e formar publicos de visitantes | apos aceitar Publicidade | 90 dias |
| `_fbc` | cookie primario | Meta (Meta Pixel) | guardar o clique em anuncio do Facebook/Instagram (`fbclid`) | apos aceitar Publicidade, com `fbclid` na entrada | 90 dias |
| `baseforma-ads-purchases` | localStorage | Baseforma | numeros de pedido ja enviados as plataformas de anuncio | primeira compra aprovada enviada | ate revogar ou limpar |

`ad_storage`/`ad_user_data`/`ad_personalization` so viram `granted` com esse aceite. Nao ha correspondencia avancada nem enhanced conversions. A revogacao nega os sinais, chama `fbq('consent', 'revoke')` e apaga os quatro itens. A pagina `/privacidade` mostra a tabela de opcionais apenas quando o ID esta configurado. O cookie de conta e HttpOnly, SameSite=Lax, Secure em producao e carrega token opaco aleatorio; somente seu hash e persistido. O valor de `baseforma-cart-recovery` contem somente identificador e token; os dados do lead ficam no armazenamento do servidor, sujeito a `CART_RECOVERY_RETENTION_DAYS`.

## Regra para scripts opcionais

O estado inicial e a ausencia de permissao. Um novo script de medicao ou marketing deve:

1. ser inventariado neste documento e na pagina `/privacidade` antes da ativacao;
2. ter finalidade, fornecedor e prazo definidos;
3. mudar a revisao do inventario (`getCookieInventoryRevision` em `lib/analytics-config.js`, gravada como `revision` no consentimento), invalidando escolhas anteriores e apresentando o aviso atualizado. `COOKIE_CONSENT_VERSION` so muda se a estrutura salva mudar;
4. consultar `hasCookieConsentCategory(consent, "analytics")` (medicao) ou `hasCookieConsentCategory(consent, "marketing")` (publicidade) antes de ser injetado;
5. reagir ao evento `baseforma:cookie-consent-changed`;
6. remover cookies e interromper a coleta quando houver revogacao, se o fornecedor permitir;
7. receber teste de carregamento antes e depois da escolha.

Sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`, aceitar a categoria opcional apenas persiste a escolha (revisao `base`). Com o ID, a revisao vira `ga4-1`: quem respondeu antes ve o aviso de novo, e aceitar carrega o GA4. Recusar mantem a categoria `analytics` desabilitada. Uma escolha invalida, expirada, de outra versao ou de outra revisao volta a ser tratada como ausencia de consentimento.

## Verificacao rapida

```bash
rg -n "cookies\\(|document\\.cookie|Set-Cookie|localStorage|sessionStorage|next/script|<script|gtag|fbq|GTM-|pixel|hotjar|clarity" app components lib
npm run test:cookie-consent
node --test test/analytics.test.js test/ads.test.js
npm run build
```

No navegador, validar:

1. primeira visita mostra o aviso sem bloquear navegacao por teclado;
2. aceitar salva `analytics: true` e fecha o aviso;
3. limpar a preferencia e recusar salva `analytics: false`;
4. o botao do rodape reabre o painel, informa a escolha e devolve o foco ao fechar;
5. `Escape` fecha apenas um painel reaberto, nunca descarta uma primeira escolha.
6. com `NEXT_PUBLIC_GA_MEASUREMENT_ID` definido: sem escolha ou com recusa nao ha request a `googletagmanager.com`; apos aceitar, o script `data-baseforma-analytics` aparece; revogar apaga `_ga*`.
7. com tags de anuncio definidas: o aviso mostra "Escolher por finalidade"; aceitar so Medicao nao carrega `connect.facebook.net` nem `config` do `AW-`; revogar Publicidade apaga `_gcl_*`, `_fbp` e `_fbc`. Roteiro completo em `docs/ops/ads-tracking.md`.
