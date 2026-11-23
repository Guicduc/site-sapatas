# Playbook de lançamento de tráfego pago (Google Ads e Meta Ads)

Roteiro para colocar a Baseforma em mídia paga com medição confiável. Complementa
`docs/ops/ads-tracking.md` (tags e painéis), `docs/ops/analytics.md`,
`docs/ops/privacy-cookies.md` e `docs/seo/keyword-research.md`.

- O admin (`/admin/relatorios` e pedidos) é a **fonte da verdade** de vendas. Google Ads, Meta e
  GA4 só enxergam quem aceitou cookies e sempre mostram menos do que o real.
- **Decisão do responsável** marca o que depende de margem, caixa e estratégia. Não invente valores.
- Não crie cupons para campanhas. Os cupons públicos estão em `lib/promotion-policy.js`
  (`TRACO10`, `PRIMEIRO15`, `FRETEGRATIS`; `VOLTE5` é o do panfleto). Nunca divulgue códigos privados.
- Vocabulário: **"ponteira"** para o que encaixa no tubo, **"sapata"** para pé plano de móvel.
  Nunca anuncie "sapata interna" (o mercado entende perfilado de eletrocalha).

## Como a medição funciona (resumo)

| Peça | Comportamento |
| --- | --- |
| Consentimento | Tags de anúncio (Google Ads e Meta Pixel) só carregam após o aceite da categoria **"Publicidade"**; o GA4 só após **"Medição"**. Consent Mode v2 em modo básico: sem aceite, nenhum request. |
| Cobertura esperada | Só uma fração das visitas aceita (estimativa de 40% a 60%). Números das plataformas são amostra, não total. |
| Google Ads `purchase` | Dispara somente quando o pagamento volta **aprovado** em `/pedido-confirmado`. `value` = produtos menos desconto, sem frete, em BRL; `transaction_id` = número público do pedido. |
| Pix/boleto aprovados depois | O navegador não vê. Para cobrir, o pedido guarda `utm_*` (primeiro e último toque) e, com consentimento de publicidade, `gclid`/`gbraid`/`wbraid`/`fbclid`. O admin em `/admin/relatorios` exporta CSV de pedidos pagos com `gclid` no formato de importação de conversões offline do Google Ads. |
| Meta Pixel | `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase` (`eventID` = `purchase-<número do pedido>`) e `Lead`. Sem correspondência avançada. |
| GA4 | Já existente (`docs/ops/analytics.md`). Mantém só `utm_*` e `formato` na URL medida (e o `gclid` quando "Publicidade" também foi aceita). |

## 1. Checklist de pré-lançamento

Não ligue nenhuma campanha antes de fechar este bloco inteiro.

### 1.1 Contas

- [ ] **Google Ads**: conta criada com moeda **BRL** e fuso **(GMT-03:00) São Paulo**. Moeda e
  fuso não podem ser alterados depois. Faturamento configurado. Se o Google pedir verificação do
  anunciante, conclua com os dados da empresa antes de escalar.
- [ ] **Meta**: Business Manager (Gerenciador de Negócios) com conta de anúncios em BRL e fuso de
  São Paulo, forma de pagamento cadastrada e Pixel (conjunto de dados) criado no Gerenciador de
  Eventos.
- [ ] **GA4** criado conforme `docs/ops/analytics.md`; `/privacidade`, `/termos`, `/trocas` e
  `/faq` publicadas (exigência das políticas de anúncio).

### 1.2 Ações de conversão no Google Ads

Em Metas > Conversões > Resumo > Nova ação de conversão:

| Ação | Origem | Categoria | Valor | Contagem | Status inicial |
| --- | --- | --- | --- | --- | --- |
| `Compra (site)` | Site, configuração manual com código | Compra | valores diferentes por conversão, padrão em BRL | Todas | **Principal** |
| `Compra importacao` (exatamente assim, sem acento: o CSV usa esse nome) | Importar > outras fontes/CRM > conversões de cliques | Compra | valores diferentes por conversão | Todas | **Secundária** (ver seção 6.2) |
| `Lead projeto especial` (opcional) | Site, configuração manual | Enviar formulário de lead | sem valor ou valor fixo (**Decisão do responsável**) | Uma | Secundária |

- [ ] Copie o **ID da conta** (`AW-XXXXXXXXX`) e o **rótulo** de `Compra (site)` (o texto após
  a barra em `send_to: 'AW-XXXXXXXXX/rotulo'`) e, se existir, o rótulo da ação de lead.
- [ ] Ação de importação com janela de 90 dias, criada **antes** de ligar as campanhas para que
  todos os cliques possam ser importados.
- [ ] Conversões otimizadas: **desligadas** (seção 7). **Inclusão automática de tag: ligada**.
- [ ] Só **uma** ação de compra Principal. Vincular GA4 ao Google Ads é opcional (**Decisão do
  responsável**, passo 10 de `docs/ops/analytics.md`); se vincular, **não** importe o `purchase`
  do GA4 como Principal.
- [ ] **Não combine** a tag do GA4 com a do Google Ads ("Combinar tags" / destinos extras na tag
  do Google): quebraria a separação entre "Medição" e "Publicidade" (`docs/ops/ads-tracking.md`).

### 1.3 Meta Pixel e domínio

- [ ] Gerenciador de Eventos > Pixel > Configurações: **"Correspondência avançada automática"
  desligada** (o site não envia e-mail, telefone ou nome) e configuração automática de eventos
  desligada (o código já usa `autoConfig` desligado; o painel não deve religar).
- [ ] Domínio: Configurações do negócio > Segurança da marca > Domínios > `baseforma.com.br` >
  **registro DNS TXT**. A zona está no **modo avançado do Registro.br**: crie o TXT na raiz
  como a Meta mostrar, aguarde a propagação e clique em Verificar.
- [ ] Mensuração de Eventos Agregados: se a tela de priorização ainda aparecer para o domínio,
  **Purchase em primeiro**, depois InitiateCheckout, AddToCart e ViewContent.

### 1.4 GA4

- [ ] Mercado Pago nas **referências indesejadas** (passo 5 de `docs/ops/analytics.md`); sem
  isso, o retorno do pagamento rouba a atribuição. `purchase` como evento principal (passo 6).

### 1.5 Variáveis na Vercel

Project `site-sapatas` > Settings > Environment Variables, ambiente **Production apenas**
(Preview e Development vazios para não misturar teste com dado real). Prefira o painel web: no
PowerShell, `vercel env add` com pipe grava BOM invisível.

| Variável | Valor | Obrigatória |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` (já existe) | sim |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-XXXXXXXXX` | para Google Ads |
| `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` | rótulo da ação `Compra (site)` | para Google Ads |
| `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` | rótulo da ação de lead | opcional |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID numérico do Pixel | para Meta |

- [ ] **Refaça o deploy de `main`**: `NEXT_PUBLIC_*` entra no build; sem redeploy nada muda.
- [ ] A revisão do inventário de cookies muda e **todos veem o aviso de novo** (esperado).
  Confira que `/privacidade` lista as tecnologias de publicidade.

### 1.6 Validação no navegador (sempre em aba anônima nova)

| Cenário | Esperado |
| --- | --- |
| Sem responder ao aviso | Nenhum request a `googletagmanager.com`, `google-analytics.com`, `googleadservices.com`, `doubleclick.net`, `connect.facebook.net` ou `facebook.com/tr`. |
| Recusar tudo | Igual ao anterior. |
| Aceitar só "Medição" | GA4 carrega. Google Ads e Pixel **não** carregam. |
| Aceitar só "Publicidade" | Tag do Google Ads e Pixel carregam. GA4 **não**. |
| Aceitar tudo e navegar | Meta Pixel Helper mostra `PageView` em cada página, `ViewContent` no configurador, `AddToCart` ao adicionar, `InitiateCheckout` no formulário do carrinho e `AddPaymentInfo` antes de ir ao Mercado Pago. Tag Assistant (tagassistant.google.com) mostra a tag `AW-` e o GA4. |
| Revogar no rodapé | As tags param de enviar e os cookies de publicidade somem. |
| Abrir `/admin` | Nenhuma tag de anúncio. |

Use também **Testar eventos** (Meta) e o DebugView do GA4.

### 1.7 Pedido teste real

1. Em aba anônima, abra uma página com parâmetros de teste, por exemplo
   `https://www.baseforma.com.br/familias/sapata-tubo-quadrado?utm_source=teste&utm_medium=teste&utm_campaign=teste-lancamento`.
   Não invente `gclid`: um `gclid` falso entraria no CSV de importação e geraria erro.
2. Aceite todos os cookies, configure uma peça barata e pague com **cartão** (aprovação imediata).
3. Na volta a `/pedido-confirmado`, confirme:
   - Tag Assistant: hit de conversão `AW-XXXXXXXXX/<rótulo>` com `value` = produtos menos
     desconto (sem frete), `currency` BRL e `transaction_id` = número do pedido.
   - Meta (Testar eventos): `Purchase` com o mesmo valor e `eventID` `purchase-<número>`.
   - GA4 DebugView: `purchase` com o mesmo `transaction_id`.
4. Em `/admin/relatorios` > "Origem das vendas", confira a linha `teste / teste / teste-lancamento`.
5. A conversão do teste **não aparece nos relatórios do Google Ads** (não houve clique em
   anúncio). Valida-se o disparo da tag e o status da ação, que passa a "Gravando conversões"
   em até 24 h após o primeiro disparo real.
6. Repita com Pix pago depois de fechar a aba: nenhuma tag deve disparar.
7. Destino do pedido teste (estornar, arquivar ou produzir): **Decisão do responsável**. Nunca
   o inclua em upload de conversão.

## 2. Convenção de UTM

Regras: **tudo em minúsculas**, sem acento, sem espaço (use hífen). Os nomes de campanha viram
`utm_campaign`, então use o mesmo padrão dentro do Google Ads e da Meta.

| Parâmetro | Valores |
| --- | --- |
| `utm_source` | `google` (Google Ads), `meta` (anúncios criados no Gerenciador de Anúncios, em Facebook ou Instagram), `instagram` (só para impulsionamento feito pelo app do Instagram; prefira o Gerenciador) |
| `utm_medium` | `cpc` (Google Search) · `paid_social` (Meta) |
| `utm_campaign` | `<rede>-<cluster>-<aaaamm>`, por exemplo `search-ponteira-tubo-202612`, `search-sapata-moveis-202612`, `meta-vendas-metalon-202612` |
| `utm_content` | identificador do anúncio/criativo (`{creative}` no Google; `{{ad.name}}` na Meta) |
| `utm_term` | palavra-chave (`{keyword}` no Google); na Meta, o conjunto de anúncios |

### Google Ads

- Inclusão automática de tag **ligada** (o `gclid` é o que alimenta a importação offline).
- Conta > Configurações > **Sufixo do URL final** (vale para todas as campanhas, sem redirecionar):

```text
utm_source=google&utm_medium=cpc&utm_campaign={_campanha}&utm_content={creative}&utm_term={keyword}&utm_id={campaignid}
```

- Em cada campanha, em Opções de URL > Parâmetros personalizados, crie o parâmetro `campanha`
  (o painel mostra `{_` antes do nome; na URL ele é referenciado como `{_campanha}`) com o nome no
  padrão acima. Não há
  ValueTrack com nome de campanha; `utm_id={campaignid}` cruza com o relatório. Teste a URL no
  editor antes de publicar.

### Meta Ads

No nível do anúncio > Rastreamento > **Parâmetros de URL**:

```text
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

A Meta acrescenta o `fbclid`. Nomeie campanhas, conjuntos e anúncios em minúsculas com hífen:
os nomes vão literalmente para a URL.

## 3. Google Ads: rede de pesquisa

### 3.1 Configurações comuns a todas as campanhas

- Tipo **Pesquisa**, sem **Rede de Display** e sem **Parceiros de pesquisa** no lançamento.
- Local Brasil, opção "Presença" (restrição regional: **Decisão do responsável**); idioma português.
- Correspondência **frase** (`"..."`) e **exata** (`[...]`); sem ampla no lançamento.
- Um anúncio responsivo por grupo, com o termo do grupo no título.
- Recursos: sitelinks para `/como-funciona`, `/processo`, `/faq`, `/catalogo` e
  `/projeto-especial`; frases de destaque "Sem pedido mínimo", "TPU", "4 cores", "Preço e prazo
  na hora"; snippet estruturado "Tipos": tubo redondo, metalon, oblongo, ponteira bola.

### 3.2 Estrutura

URLs conferidas no código (`families` em `lib/site-data.js`, categorias em
`catalog/categories.json`, ambas no `app/sitemap.js`). A página de família explica medida e
parede e leva ao configurador, por isso é o destino padrão. O configurador só aceita `formato`.

**Campanha `search-ponteira-tubo-<aaaamm>`** (núcleo; recebe a maior parte do orçamento)

| Grupo | URL final | Palavras-chave |
| --- | --- | --- |
| Metalon | `/familias/sapata-tubo-quadrado` | "ponteira para metalon", "ponteira interna metalon", "ponteira para tubo quadrado", "ponteira para tubo retangular", "ponteira retangular interna", "ponteira plástica para metalon", "tampa para metalon", "sapata para metalon", [ponteira metalon 20x20], [ponteira interna 20x20], [ponteira metalon 30x30], [ponteira metalon 50x30], [ponteira metalon 30x20], [ponteira metalon 40x40], [ponteira metalon 50x50] |
| Tubo redondo | `/familias/sapata-tubo-redondo` | "ponteira para tubo redondo", "ponteira interna redonda", "ponteira interna para tubo redondo", "ponteira interna 7/8", "ponteira para cadeira tubular", "sapata para cadeira tubular", "ponteira para cadeira de ferro", "sapata para cadeira de ferro", "ponteira para pé de mesa tubular", "sapata cadeira 7/8", [ponteira interna 3/4], [ponteira interna 1 polegada], [ponteira tubo 25mm] |
| Oblongo | `/familias/sapata-tubo-oblongo` | "ponteira oblonga", "ponteira interna oblonga", "ponteira para tubo oblongo", "ponteira para tubo oval", "ponteira oval para cadeira", [ponteira 16x30], [ponteira oblonga 16x30] |
| Ponteira interna (genérico) | `/configurar/ponteira-interna-tubo` | "ponteira interna", "ponteira interna para tubo", "ponteira para tubo", "ponteira plástica para tubo", "ponteira para pé de cadeira", "ponteira interna para cadeira", "sapata para tubo", "ponteira sob medida" |

**Campanha `search-sapata-moveis-<aaaamm>`**

| Grupo | URL final | Palavras-chave |
| --- | --- | --- |
| Sapata lisa (genérico) | `/configurar/sapata-base-lisa` | "sapata para móveis", "sapata para pé de mesa", "sapata de plástico para móveis", "sapata para pé de sofá", "sapata para poltrona", "sapata de encaixe para móveis", "sapata com pino" |
| Sapata lisa redonda | `/familias/sapata-lisa-redonda` | "sapata redonda para móveis", "sapata redonda para pé de mesa" |
| Sapata lisa quadrada | `/familias/sapata-lisa-quadrada` | "sapata quadrada para móveis", "sapata retangular para móveis", "sapata para pé de mesa quadrada" |
| Com parafuso | `/configurar/sapata-com-parafuso` (ou `/familias/sapata-com-parafuso-redonda` e `/familias/sapata-com-parafuso-quadrada` se separar redonda/quadrada) | "sapata com parafuso", "pé de borracha com parafuso", "pezinho com parafuso", "sapata para pé de madeira", "sapata para cadeira de madeira" |

**Campanha `search-nicho-<aaaamm>`** (volume baixo; orçamento pequeno e separado)

| Grupo | URL final | Palavras-chave |
| --- | --- | --- |
| Ponteira bola | `/familias/sapata-esferica` | "ponteira bola", "ponteira bola para cadeira", [ponteira bola 7/8], [ponteira bola 3/4] |
| Base trenó | `/familias/sapata-u` | "sapata para cadeira base trenó", "sapata base trenó", "sapata meia cana", "sapata para cadeira de arame" |

Opcional, **Decisão do responsável**: campanha B2B para `/projeto-especial` ("fabricante de
ponteiras plásticas", "fornecedor de ponteiras") otimizando para `Lead projeto especial`, com
"fabricante", "fábrica" e "fornecedor" negativados nas campanhas de e-commerce.

Nunca use isoladas "sapata", "ponteira", "ponteira oval", "ponteira 3/4", "sapata U" ou
"cadeira base trenó" (busca pela cadeira): todas puxam outros mercados.

### 3.3 Lista de palavras-chave negativas (nível da conta)

Lista compartilhada "negativas-base", aplicada a todas as campanhas, derivada da seção (h) de
`docs/seo/keyword-research.md`.

| Motivo | Negativas |
| --- | --- |
| Eletrocalha/perfilado | eletrocalha, perfilado, "38x38", "4 furos", leito |
| Construção civil | fundação, pilar, concreto, viga, baldrame, radier, "sapata isolada", "sapata corrida", estribo, ferragem |
| Automotivo e outras máquinas | freio, lona, escapamento, silenciador, esportiva, automotiva, moto, terminal, "máquina de costura", "ferro de passar", andaime, escada, elevador |
| Saúde e acessórios | muleta, bengala, andador, "cadeira de rodas", "cadeira de banho", ballet, óculos, seringa |
| Banner e cortina | banner, varão, cortina |
| Artes marciais | faixa, "jiu jitsu", karatê |
| Ferramentas | parafusadeira, martelete, riscadeira, roçadeira, odontológico, ultrassom |
| Outros produtos com o mesmo nome | lápis, cadarço, mdf, "sapata u para mdf", câmera, tripé |
| Fora do catálogo | niveladora, nivelador, regulável, rosca, rodízio, rodinha, giratória, "ponteira externa", silicone, feltro, capa, adesivo, adesiva, deslizante, prego |
| Faça você mesmo / grátis | "como fazer", molde, stl, grátis, gratuito, download, thingiverse, "arquivo 3d" |
| Emprego | emprego, vaga, vagas, trabalhe, salário |
| Informacional sem compra | ncm, significado, "o que é" |
| Marketplaces | "mercado livre", shopee, amazon, magalu (quem digita o marketplace quer comprar lá) |
| Concorrentes | fermaplast, cosmos, codevenplast, completare, popmov, essentra, emar. Disputar marca de concorrente: **Decisão do responsável**; no lançamento, negativar |
| Marcas de cadeira | eames, eiffel, bertoia, tolix, tramontina, allegra, cesca (nunca use em texto de anúncio) |
| Atacado/kit | atacado, "kit 1000", "1000 peças", "100 peças". Manter ou não: **Decisão do responsável** (o produto é por unidade, sem mínimo; lote grande vai para `/projeto-especial`) |

"silicone", "capa" e "feltro" bloqueiam o cluster "protetor de pé de cadeira" (volume alto,
outro produto). Se um dia houver anúncio para ele, remova-as só daquela campanha.

### 3.4 Ângulos de texto

Diferenciais do site: medida externa e parede do tubo, sem pedido mínimo (a partir de 1
unidade), TPU, 4 cores, preço e prazo na hora, produção sob demanda.

Exemplos de título (até 30 caracteres; confira no editor):

- Ponteira para Metalon · Ponteira Oblonga 16x30 · Ponteira Interna em TPU
- Feita na Medida do Seu Tubo · Ajustada à Parede do Tubo
- Sem Pedido Mínimo · A Partir de 1 Unidade
- Preço e Prazo na Hora · Preto, Branco, Cinza ou Marrom
- Metalon 20x20, 30x30, 50x30 · Tubo 3/4, 7/8 e 1 Polegada · Sapata Sob Medida p/ Móveis

Exemplos de descrição (até 90 caracteres):

- Informe a medida externa e a parede do tubo e veja o preço na hora. Sem pedido mínimo.
- O encaixe é calculado pela parede do seu tubo: chapa 18, chapa 20 ou chapa grossa.
- Produção sob demanda em TPU, a partir de 1 unidade. Configure e compre online.

Não escreva preço em reais no anúncio sem conferir o "a partir de" da página no dia (ele sai do
motor de preço e pode mudar). Não prometa frete grátis sem a condição do cupom `FRETEGRATIS`
(pedido mínimo). Divulgar `PRIMEIRO15` nos anúncios: **Decisão do responsável**.

### 3.5 Shopping e Performance Max: não agora

- Produto paramétrico: o preço depende da medida e da parede, e o feed do Merchant Center exige
  item com preço fixo e página com aquele preço. Hoje isso não existe.
- Sem feed, a Performance Max gasta em Display, YouTube e Discover com pouco controle de termos e
  precisa de um volume de conversões que a conta não tem (ainda menor com a medição parcial).
- Reavaliar com feed de SKUs representativos (seção 7) e 30+ conversões por mês na Pesquisa.

## 4. Meta Ads

### 4.1 Objetivo por fase

| Fase | Objetivo | Otimização | Quando avançar |
| --- | --- | --- | --- |
| Semana 1 | Tráfego | Visualizações da página de destino | Pixel recebendo `PageView`/`ViewContent` sem erro no Gerenciador de Eventos |
| Semanas 2 a 4 | Vendas (conversão no site) | `AddToCart` ou `InitiateCheckout` | Conjunto chega perto de ~50 eventos `Purchase` por semana |
| Depois | Vendas | `Purchase` | — |

Otimizar para `Purchase` com poucas vendas prende o conjunto no aprendizado, e o consentimento
reduz ainda mais os eventos. Advantage+ Shopping: não agora (sem catálogo de produtos).

### 4.2 Públicos

- **Prospecção**: Brasil (região: **Decisão do responsável**), público amplo (Advantage+) com
  sugestões de interesse como marcenaria, serralheria, móveis, design de interiores, reforma e
  faça você mesmo; compare com um conjunto restrito aos interesses.
- **Remarketing** (depois que o Pixel tiver dados): visitantes dos últimos 30 dias; `AddToCart`
  ou `InitiateCheckout` sem compra em 14 dias. Exclua compradores de 30 dias da prospecção. Os
  públicos serão menores que o tráfego real (só quem aceitou publicidade).
- Nenhuma lista de clientes é enviada à Meta.

### 4.3 Criativos

- A peça **no tubo**: ponteira encaixando no metalon, close do encaixe, cadeira de ferro com a
  ponteira nova. Antes e depois no piso (tubo aberto riscando × ponteira instalada), sem prometer
  "nunca risca".
- Paquímetro no tubo e a tela do configurador mostrando o preço; as 4 cores lado a lado; medidas
  fora do padrão (oblongo, metalon grande).
- Texto com o vocabulário da pesquisa, sem marcas de terceiros. Imagens de produto são produzidas
  fora do repositório, não como sobreposição em código.

### 4.4 URLs de destino

Mesmas da seção 3.2: `/familias/sapata-tubo-quadrado` para criativos de metalon,
`/familias/sapata-tubo-redondo` para cadeira tubular/de ferro, `/familias/sapata-tubo-oblongo`
para oblongo, `/catalogo` para criativos com várias peças, `/configurar/sapata-base-lisa` para pé
de móvel.

## 5. Lances e orçamento

### 5.1 Google Ads

| Fase | Estratégia | Condição para sair |
| --- | --- | --- |
| Lançamento | **Maximizar cliques com limite de CPC máximo** ou **CPC manual** | ~30 conversões principais em 30 dias na campanha |
| Depois | **Maximizar conversões** (sem meta) | 2 a 4 semanas estáveis |
| Opcional | Maximizar conversões com CPA desejado próximo do CPA real recente; ROAS desejado só com volume bem maior | — |

Nunca comece com CPA ou ROAS desejado: sem histórico, o algoritmo não entrega ou gasta mal.
Antes de trocar a estratégia, defina a ação Principal conforme a seção 6.2.

### 5.2 Fórmulas (preencha com os números reais)

Os valores de entrada são **Decisão do responsável**; o documento não define reais.

- **CPA de equilíbrio** = ticket médio de produtos (sem frete, após desconto) × margem de contribuição.
- **CPC máximo sustentável** = CPA de equilíbrio × taxa de conversão clique→pedido (comece
  conservador; recalcule com os pedidos reais do admin após 2 a 4 semanas).
- **Orçamento diário da campanha** = cliques desejados por dia × CPC médio estimado (Planejador de
  palavras-chave, faixa baixa do lance de topo de página).
- **Orçamento de teste** ≈ (pedidos que você quer ver ÷ taxa de conversão) × CPC médio. Avalie o
  teste só depois de gastar esse valor.
- **Meta, orçamento por conjunto** ≈ (custo por evento otimizado × 50) ÷ 7 por dia. Se não couber,
  otimize um evento mais acima do funil ou junte conjuntos.
- Mude orçamento aos poucos (até 20% a 30% por vez na Meta) para não reiniciar o aprendizado.

## 6. Rotina semanal

Dia fixo (ex.: segunda). Com a importação como Principal, repita o upload na quinta.

### 6.1 Leitura de resultado

1. `/admin/relatorios`: pedidos **pagos** por origem e campanha, valor de produtos e ticket médio.
2. Por campanha, compare pedidos reais no admin × Google Ads × Meta × GA4. As plataformas ficam
   abaixo do admin (consentimento); a Meta soma vendas por visualização, então veja também a
   janela "7 dias após o clique".
3. Planilha semanal: gasto, cliques, pedidos reais, receita real e CPA real (gasto ÷ pedidos).

### 6.2 Importação de conversões offline (Google Ads)

1. `/admin/relatorios` > "Baixar conversões Google Ads (CSV)". O arquivo traz os pedidos
   **pagos** com `gclid` dos últimos 90 dias (`?dias=7` na URL do botão encurta o período), com
   horário de São Paulo e valor = produtos menos desconto. Remova pedidos teste ou estornados.
   O nome da conversão no arquivo é `Compra importacao`; se a ação tiver outro nome, use
   `?conversao=<nome exato>` na URL ou ajuste a coluna antes de enviar. O horário da conversão é
   o da criação do pedido (checkout), não o da aprovação do pagamento.
2. Google Ads > Metas > Conversões > Uploads > enviar o arquivo.
3. Reenviar uma linha já importada (mesmo `gclid`, ação e horário) é rejeitado como duplicada e
   não conta de novo, então enviar os 90 dias inteiros toda semana é seguro.
4. Horas depois, confira o diagnóstico (`gclid` inválido, clique fora da janela de 90 dias ou de
   outra conta). Cliques só com `gbraid`/`wbraid` (iOS) ficam gravados no pedido, mas o CSV
   atual só exporta `gclid`.

**Por que duas ações e qual deve ser Principal.** O Google Ads não deduplica entre ações de
conversão diferentes: o mesmo pedido pago com cartão aparece na tag (`Compra (site)`) e no CSV
(`Compra importacao`). Como o export não indica se o pedido já foi medido no navegador, não dá
para enviar só a diferença. Com as duas como Principais, cada venda com cartão contaria duas vezes
e o Maximizar conversões daria lances altos demais.

Recomendação:

- **Semanas 1 a 4 (lances por clique):** `Compra (site)` **Principal**, `Compra importacao`
  **Secundária**. Lance por clique não usa conversões; a comparação semanal mostra quanto a tag
  perde (Pix/boleto aprovados depois, cliente que não volta ao site).
- **Antes de ligar Maximizar conversões:** se a importação trouxer consistentemente mais pedidos
  que a tag (por exemplo, 20% ou mais), inverta: `Compra importacao` **Principal**,
  `Compra (site)` Secundária, com upload duas vezes por semana. A importação é completa para quem
  tem `gclid` (cartão, Pix e boleto); a tag é imediata mas cega para pagamentos posteriores. Se a
  diferença for pequena, mantenha a tag como Principal: ela não depende da rotina manual nem
  sofre atraso.
- O `gclid` só é gravado com consentimento de publicidade, o mesmo público da tag. A importação
  recupera pagamentos tardios, não visitantes que recusaram cookies.

### 6.3 Termos de pesquisa e otimização

1. **Termos de pesquisa** (7 dias): termo fora do produto vira negativa em "negativas-base";
   termo bom com volume vira palavra-chave exata no grupo certo.
2. Pause palavras-chave ou anúncios com gasto acima de **2 × o CPA de equilíbrio** sem nenhum
   pedido real (no admin) e sem `AddToCart`. O fator 2 compensa a medição parcial.
3. Meta: mínimo de 2 anúncios por conjunto; pause o criativo com custo por evento muito acima
   da média após gasto relevante.
4. Muitos cliques e poucos `AddToCart` indicam desencontro entre termo e página. Registre toda
   mudança (data, o quê, por quê) na planilha.

## 7. Limitações conhecidas e próximos passos

| Limitação | Efeito | Próximo passo |
| --- | --- | --- |
| Medição só com consentimento (modo básico) | Plataformas veem ~40% a 60% das visitas; aprendizado mais lento | Aceitar como piso; usar o admin como verdade |
| Pix/boleto aprovados depois do retorno | Tag não vê | Importação offline (seção 6.2); depois, upload automático via API |
| Sem Conversões otimizadas (Google) e sem API de Conversões (Meta) | Menos correspondência e atribuição | Avaliar Enhanced Conversions e CAPI server-side, com revisão de privacidade (hash de e-mail e base legal) e `event_id` igual ao do Pixel para deduplicação |
| Sem feed do Merchant Center | Sem Shopping/PMax | Feed com SKUs representativos (medidas populares como metalon 20x20, tubo 7/8, oblongo 16x30) e preço fixo por item, se a página puder refletir aquele preço |
| Configurador só aceita `formato` | Anúncio de medida exata não abre com a medida preenchida | Parâmetros de medida na URL do configurador; landing pages por medida com conteúdo único (fase 2 da pesquisa) |
| Estornos/cancelamentos não são abatidos nas plataformas | Conversões infladas | Ajustes de conversão (retração) no Google Ads |
| GA4 sem servidor | `purchase` tardio fica fora do GA4 | Measurement Protocol (já previsto em `docs/ops/analytics.md`) |
| Sem canal de contato rápido nos anúncios | Dúvidas de medida viram abandono | Botão/extensão de WhatsApp: número, horário e quem responde são **Decisão do responsável** |
