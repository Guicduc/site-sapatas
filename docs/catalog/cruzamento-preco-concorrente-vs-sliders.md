# Cruzamento: concorrente x custo Orca

Data: 2026-05-26

Objetivo: comparar precos de concorrentes extraidos das imagens com o custo/preco gerado pelos dados de fatiamento Orca, para orientar a logica real de precificacao.

## Regra atual

A politica usa tres camadas:

1. custo direto calculado com `materialGrams` e `printMinutes` vindos do Orca;
2. margem regressiva por familia, menor em itens internos de tubo e maior em sapatas lisas pequenas;
3. referencia de mercado quando houver concorrente comparavel na base `base-concorrentes-sapatas.csv`.

O configurador nao deve usar custo calculado por geometria. Quando nao existe amostra Orca exata em `lib/sliced-pricing-data.js`, a configuracao deve usar preco intermediario calculado por interpolacao entre referencias Orca da mesma familia/formato.

## Dados usados

- Base concorrente: `docs/catalog/base-concorrentes-sapatas.csv`.
- Motor atual: `calculatePriceBreakdown` em `lib/configurator-data.js`.
- Base Orca: `lib/sliced-pricing-data.js`.
- Custo direto: material com perda + energia por tempo de impressao.
- Taxa de canal: `6%`.
- Energia por hora: `R$ 0,1312/h`.

## Leitura comercial

A referencia de mercado nao substitui o custo real. Ela atua como faixa comercial:

- em ponteiras internas commodity, o preco fica perto do mercado quando o custo permite, mas nunca abaixo do piso sustentavel;
- em sapatas lisas configuraveis, o preco usa piso parcial de mercado para evitar peca pequena vendida barato demais;
- quando o concorrente injetado e muito barato e o nosso custo real fica acima, o item deve ser vendido como sob medida, nao como commodity;
- se uma amostra Orca parecer subestimada, o dado deve ser refeito no Orca em vez de corrigido com aproximacao manual ou geometrica.

## Amostras de calibracao

| Concorrente | Nossa familia | Preco concorrente | Input Orca | Leitura |
| --- | --- | ---: | --- | --- |
| ESSENTRA SQR111205A - ponteira quadrada 50x50 | sapata tubo quadrado | R$ 4,68 | `materialGrams` + `printMinutes` da amostra compativel | Validar novo fatiamento se o peso parecer baixo. |
| ESSENTRA BFSA010A - sapata com haste | sapata lisa redonda | R$ 2,23 | `materialGrams` + `printMinutes` da amostra compativel | Existe espaco para margem alta em peca pequena. |
| ESSENTRA SIG 1353C - ponteira/sapata quadrada 2" | sapata lisa quadrada | R$ 3,87 | `materialGrams` + `printMinutes` da amostra compativel | Usar como ancora parcial, sem copiar preco de injetado. |
| ESSENTRA RDR111057A - ponteira quadrada 18x18 | sapata tubo quadrado | R$ 0,37 | `materialGrams` + `printMinutes` da amostra compativel | Commodity injetado pode inviabilizar competicao direta. |

## Plano de precificacao

Manter uma politica composta:

```text
preco final =
  max(
    preco por margem regressiva sobre custo Orca,
    piso comercial por unidade/kit,
    ancora de mercado quando aplicavel
  )
```

Com uma excecao importante:

```text
se for commodity injetada e nosso custo Orca estiver alto demais,
nao forcar preco competitivo; marcar como sob medida/premium.
```

Essa regra protege margem nas pecas pequenas, evita inviabilizar pecas grandes e impede que o catalogo tente competir diretamente com item injetado barato onde a impressao 3D nao tem vantagem economica.
