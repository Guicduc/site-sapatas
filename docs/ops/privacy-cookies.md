# Inventario de cookies e tecnologias semelhantes

Este documento registra o inventario tecnico verificado em 13/07/2026 e a regra operacional para novos scripts. A pagina publica correspondente fica em `/privacidade`.

## Estado atual

- Nao ha Google Analytics, Google Tag Manager, pixels de publicidade, mapas de calor, videos incorporados ou scripts remotos de marketing.
- `components/structured-data.jsx` gera apenas JSON-LD estatico. Ele nao executa codigo externo nem grava dados no navegador.
- A fonte declarada com `next/font` e servida pela propria aplicacao; nao ha requisicao do navegador ao Google Fonts.
- ViaCEP, Mercado Pago, Melhor Envio, Focus NFe e Resend sao integracoes funcionais chamadas pelo servidor ou destinos abertos por acao explicita do usuario. Nao sao scripts de rastreamento carregados nas paginas.

## Inventario

| Nome | Tecnologia | Finalidade | Criacao | Prazo |
| --- | --- | --- | --- | --- |
| `baseforma-admin` | cookie HttpOnly, SameSite=Lax | sessao administrativa | login em `/admin` | 12 horas |
| `baseforma-account` | cookie HttpOnly, SameSite=Lax | sessao da conta do cliente | confirmacao do codigo por e-mail | 30 dias |
| `baseforma-order-access` | cookie HttpOnly, SameSite=Lax | acesso temporario ao pedido criado | `POST /api/orders` | 2 horas |
| `baseforma-cart` | localStorage | persistencia do carrinho | uso do configurador/carrinho | ate limpeza do navegador |
| `baseforma-cart-recovery` | localStorage | identificador e token do carrinho salvo | recuperacao de carrinho no checkout | ate conversao ou limpeza |
| `baseforma-last-order-id` | sessionStorage | reabertura da confirmacao do pedido | pedido criado | ate fechar a aba |
| `baseforma-cookie-consent` | localStorage | escolha e validade do consentimento | aviso/centro de preferencias | 180 dias |

Todas as tecnologias acima sao funcionais. Os cookies de sessao sao assinados, HttpOnly e `Secure` em producao. O valor de `baseforma-cart-recovery` contem somente identificador e token; os dados do lead ficam no armazenamento do servidor, sujeito a `CART_RECOVERY_RETENTION_DAYS`.

## Regra para scripts opcionais

O estado inicial e a ausencia de permissao. Um novo script de medicao ou marketing deve:

1. ser inventariado neste documento e na pagina `/privacidade` antes da ativacao;
2. ter finalidade, fornecedor e prazo definidos;
3. incrementar `COOKIE_CONSENT_VERSION`, invalidando escolhas anteriores e apresentando o aviso atualizado;
4. consultar `hasCookieConsentCategory(consent, "analytics")` antes de ser injetado;
5. reagir ao evento `baseforma:cookie-consent-changed`;
6. remover cookies e interromper a coleta quando houver revogacao, se o fornecedor permitir;
7. receber teste de carregamento antes e depois da escolha.

Aceitar a categoria opcional hoje apenas persiste a escolha: nenhum script opcional esta configurado. Recusar mantem a categoria `analytics` desabilitada. Uma escolha invalida, expirada ou de outra versao volta a ser tratada como ausencia de consentimento.

## Verificacao rapida

```bash
rg -n "cookies\\(|document\\.cookie|Set-Cookie|localStorage|sessionStorage|next/script|<script|gtag|GTM-|pixel|hotjar|clarity" app components lib
npm run test:cookie-consent
npm run build
```

No navegador, validar:

1. primeira visita mostra o aviso sem bloquear navegacao por teclado;
2. aceitar salva `analytics: true` e fecha o aviso;
3. limpar a preferencia e recusar salva `analytics: false`;
4. o botao do rodape reabre o painel, informa a escolha e devolve o foco ao fechar;
5. `Escape` fecha apenas um painel reaberto, nunca descarta uma primeira escolha.
