# Pesquisa de palavras-chave — Baseforma (ponteiras e sapatas sob medida)

Data da coleta: 2026-11-17. Idioma/mercado: pt-BR, Brasil.

## Como os dados foram coletados (leia antes de usar)

- **Google Autocomplete** (`suggestqueries.google.com`, hl=pt-BR, gl=br): cerca de 230 sementes e varredura alfabética de A a Z e de 0 a 9 em 10 sementes centrais, somando mais de 700 sugestões únicas. **É a evidência principal.** Aparecer no autocomplete indica que há volume de busca. A quantidade de variações que uma semente gera (por exemplo, 109 para "ponteira interna") indica o tamanho do cluster.
- **Google Trends** (Brasil, últimos 5 anos, médias relativas na escala de 0 a 100 do próprio grupo comparado). Consegui 7 comparações antes de o Google bloquear por excesso de requisições (HTTP 429). Os números são relativos dentro de cada grupo, não volumes absolutos.
- **Concorrentes e marketplaces**: Fermaplast, Cosmos, Codevenplast, Completare, PopMov, Essentra, Grupo Emar, Varejão das Rodas, anúncios do Mercado Livre, Amazon, Magalu, Telhanorte e MadeiraMadeira, lidos por busca na web e por acesso direto às páginas. **O Mercado Livre bloqueia leitura direta (HTTP 403), inclusive no autosuggest**, então os títulos do ML vêm de resultados de busca.
- **Não tive acesso a volumes absolutos** (Keyword Planner ou Semrush). As faixas "Alto/Médio/Baixo" abaixo são **relativas dentro deste nicho**, que em termos absolutos é pequeno. Nenhum número exato de volume foi inventado.
- **People Also Ask**: não há API pública. As perguntas da seção (g) vêm do autocomplete em forma de pergunta, das FAQs de concorrentes (Fermaplast) e de dúvidas recorrentes em anúncios.

### Números do Google Trends obtidos (média de 5 anos, BR)

| Grupo comparado | Resultado |
|---|---|
| ponteira para cadeira / sapata para cadeira / ponteira para metalon / sapata para metalon / ponteira interna | 2 / 2 / 0 / 0 / **5** |
| ponteira interna / ponteira externa / ponteira para tubo / sapata para tubo / tampa para metalon | **5** / 1 / **4** / 1 / 3 |
| ponteira interna / ponteira 7/8 / ponteira 3/4 / ponteira 50x50 / ponteira 1 polegada | 3 / 2 / 12* / 0 / 0 |
| ponteira interna / protetor pé de cadeira / sapata de silicone / deslizante para cadeira / pezinho de cadeira | 4 / **29** / 0 / 0 / 3 |
| ponteira interna / ponteira p/ cadeira de ferro / ponteira p/ pé de cadeira / ponteira p/ cadeira tubular / sapata p/ pé de mesa | **5** / 0 / 0 / 0 / 1 |
| ponteira de borracha / sapata de borracha / pezinho de borracha / protetor pé de cadeira / ponteira plástica | 29* / 6 / 5 / **26** / 1 |
| sapata para cadeira / mesa / móveis / sofá / cama | 3 / 2 / 1 / 0 / 1 |

\* "ponteira 3/4" e "ponteira de borracha" estão inflados por muleta, bengala, andador e banner (o autocomplete confirma: "ponteira 3 4 articulada para muletas", "ponteira de borracha para bengala").

**Leitura:** "ponteira interna" e "ponteira para tubo" são as cabeças de cluster mais fortes do nicho de encaixe em tubo, cerca de 4 a 5 vezes "sapata para tubo". Para cadeira, "ponteira" e "sapata" empatam. O termo de maior volume da vizinhança é **"protetor (para) pé de cadeira"**, mas ele se refere a capas externas de silicone e feltro, ou seja, intenção adjacente e não o produto da Baseforma.

---

## (a) Resumo executivo

### Conclusões principais

1. **"Ponteira" é o nome que o mercado usa para o produto que encaixa no tubo.** Os fabricantes (Fermaplast, Cosmos, Codevenplast, Essentra) e quase todos os anúncios usam "Ponteira interna …". O autocomplete de "ponteira interna" gera 109 variações, enquanto "sapata interna" puxa principalmente **perfilado 38x38 de eletrocalha** ("sapata interna 4 furos 38x38"). O nome atual da categoria, "Sapata interna tubos", **usa a palavra errada para busca**. Felizmente o slug já é `ponteira-interna-tubo`.
2. **"Sapata" ganha para os pés planos de móvel**: "sapata para pé de mesa", "sapata para móveis", "sapata de plástico para móveis", "sapata para cadeira de madeira" e "sapata redonda para móveis". Para as famílias lisa e com parafuso, "sapata" é o termo certo.
3. **Medidas são o motor da cauda longa.** O autocomplete traz dezenas de combinações "ponteira (interna) + medida": metalon 20x20, 50x30, 30x30, 30x20, 40x40, 50x50 e 15x15, e tubo redondo 7/8, 3/4, 1", 5/8 e 1 1/4. Quem busca já sabe a medida. O site deve exibir tabelas de medidas e repetir as medidas populares em texto.
4. **"Sob medida", "personalizada" e "impressa em 3D" quase não têm volume.** Nenhuma delas gerou sugestão útil no autocomplete para ponteira ou sapata de móvel. São diferenciais de conversão (usar em descrição, H2 e argumentos), não termos-alvo principais. O alvo deve ser o termo genérico com a medida, e o diferencial entra como modificador.
5. **Armadilhas de ambiguidade:**
   - "sapata 30x30/40x40" é **fundação de construção civil**.
   - "sapata U" é **pé em U para chapa de MDF de 15 a 18 mm**.
   - "ponteira" sozinha remete a **escapamento, parafusadeira, muleta ou faixa de jiu-jitsu**.
   - "ponteira 3/4" remete a **muleta e banner**.
   - "ponteira de silicone" remete a **ballet e óculos**.

   Nunca use esses termos sem um qualificador como "para tubo", "para metalon", "para pé de cadeira", "para móveis" ou "base trenó".
6. **A Sapata U da Baseforma é uma sapata de encaixe lateral (clipe) para o tubo horizontal de cadeira base trenó/balanço**, confirmado pela imagem de uso. O mercado chama isso de **"sapata meia cana"** (Completare: "Sapata Meia Cana Reta 7/8" a 1" para Cadeira Tubular… bases lineares") ou fala em **"cadeira base trenó"**, que aparece no autocomplete. Recomendo o nome visível "Sapata U para base trenó" e o termo "meia-cana" no texto.
7. **A sapata esférica é conhecida como "ponteira bola"** ("ponteira bola 7/8", "ponteira bola para cadeira", "ponteira bola 28mm", "ponteira bola 3/4"; Cosmos: "Ponteira redonda interna bola 3/4″"). "Sapata esférica" não gera nenhuma sugestão.
8. **Dor do mercado que a Baseforma resolve:** a ponteira padrão é vendida por medida nominal, mas a parede do tubo varia (a Completare tem até a categoria "Ponteira Interna Chapa Grossa"). Daí vêm ponteiras que soltam, caem ou não entram, além de medidas raras (oblongo, 150x50, tubo importado) e de kits de 50 a 1000 peças para quem precisa de 4. Esse é o argumento central da cópia: **"feita para a medida externa e a parede do seu tubo, a partir de 1 unidade"**.

### 20 termos prioritários

| # | Termo | Intenção | Volume relativo | Página-alvo |
|---|---|---|---|---|
| 1 | ponteira interna | comercial | Alto | /configurar/ponteira-interna-tubo |
| 2 | ponteira para tubo | comercial | Alto | /configurar/ponteira-interna-tubo |
| 3 | ponteira para metalon (+ 20x20, 30x30, 50x30, 40x40, 50x50) | transacional | Alto (cluster) | /familias/sapata-tubo-quadrado |
| 4 | ponteira para tubo redondo / ponteira interna redonda | transacional | Médio-alto | /familias/sapata-tubo-redondo |
| 5 | ponteira para cadeira / ponteira para pé de cadeira | comercial | Médio-alto | /configurar/ponteira-interna-tubo + guia |
| 6 | sapata para cadeira (tubular, de ferro, 7/8, 3/4) | comercial | Médio-alto | /familias/sapata-tubo-redondo |
| 7 | ponteira para cadeira de ferro | transacional | Médio | /familias/sapata-tubo-redondo e quadrado |
| 8 | ponteira 7/8 (interna) / ponteira para cadeira tubular 7/8 | transacional | Médio | /familias/sapata-tubo-redondo |
| 9 | ponteira para pé de mesa (tubular, quadrada, retangular) | transacional | Médio | famílias tubo |
| 10 | sapata para pé de mesa | comercial | Médio | /configurar/sapata-base-lisa |
| 11 | sapata para móveis / sapata de plástico para móveis | comercial | Médio | /configurar/sapata-base-lisa |
| 12 | sapata para metalon (+ medidas) | transacional | Médio | /familias/sapata-tubo-quadrado |
| 13 | ponteira plástica (para tubo / metalon / móveis) | comercial | Médio | /catalogo |
| 14 | tampa para metalon (+ medidas) | transacional | Médio | /familias/sapata-tubo-quadrado (sinônimo) |
| 15 | ponteira oblonga / ponteira para tubo oblongo / oval / 16x30 | transacional | Baixo-médio, pouca concorrência | /familias/sapata-tubo-oblongo |
| 16 | ponteira para tubo retangular / ponteira retangular interna | transacional | Baixo-médio | /familias/sapata-tubo-quadrado |
| 17 | sapata para cadeira de madeira / para pé de madeira | comercial | Médio | /configurar/sapata-com-parafuso |
| 18 | ponteira bola (para cadeira, 7/8, 3/4) | transacional | Baixo | /familias/sapata-esferica |
| 19 | cadeira base trenó + sapata meia cana | comercial | Baixo | /familias/sapata-u |
| 20 | sapata para cadeira eames / eiffel / bertoia (TPU) | transacional | Baixo, mas com "TPU" já nas buscas | /familias/sapata-u ou guia |
| 21 | fabricante de ponteiras plásticas / ponteiras plásticas para móveis | B2B | Baixo-médio | /projeto-especial |
| 22 | como medir pé de cadeira / como medir ponteira de cadeira / como medir metalon | informacional | Baixo-médio | /guias/como-medir-tubo-para-ponteira |
| 23 | medida de metalon / tubo 7/8 em mm / chapa 18 metalon quantos mm | informacional | Médio | /guias/tabela-medidas-tubo-metalon |
| 24 | cadeira riscando o piso / protetor pé de cadeira | informacional/adjacente | Alto (protetor), Baixo (riscando) | /guias/cadeira-riscando-o-piso |
| 25 | ponteira sob medida / ponteira personalizada | diferenciador | Muito baixo | home, /projeto-especial (modificador) |

---

## (b) Clusters de palavras-chave

Legenda de volume: **A** = alto, **M** = médio, **B** = baixo (relativo ao nicho). "AC(n)" indica que a semente gerou n sugestões na varredura A a Z do autocomplete.

### Cluster 1 — Ponteira interna (cabeça do nicho de encaixe em tubo)
- **Termo principal:** ponteira interna
- **Variações (autocomplete):** ponteira interna para tubo, ponteira interna plástica, ponteira interna de plástico para tubo, ponteira interna preta, ponteira interna quadrada, ponteira interna redonda, ponteira interna retangular, ponteira interna oblonga, ponteira interna oval, ponteira interna metalon, ponteira interna para cadeira, ponteira interna para pé de cadeira, ponteira interna de borracha, ponteira interna chanfrada, ponteira interna abaulada, ponteira interna quadrada com aletas, ponteira interna redonda com aletas, ponteira interna e externa, ponteira interna pvc, tampa ponteira interna metalon
- **Intenção:** comercial/transacional
- **Volume:** A. É o termo de maior volume no Trends entre os de encaixe em tubo, com AC(109).
- **Evidência:** Trends 5 vs "sapata para tubo" 1; títulos de todos os fabricantes ("Ponteira 7/8″ Interna Reta" na Fermaplast, "Ponteira quadrada interna 20X20" na Cosmos).
- **Nota:** "com aletas", "abaulada", "reta" e "chanfrada" são variantes de forma dos fabricantes de injeção. A Baseforma pode citar "base reta" e "base com chanfro" se o modelo tiver isso. Não prometa aletas se o produto não tiver.

### Cluster 2 — Ponteira para metalon / tubo quadrado e retangular
- **Termo principal:** ponteira para metalon
- **Variações:** ponteira metalon, ponteira de metalon, ponteira para tubo metalon, ponteira plástica para metalon, ponteira interna metalon, ponteira para tubo quadrado, ponteira interna para tubo quadrado, ponteira plástica para tubo quadrado, ponteira para tubo retangular, ponteira retangular interna, ponteira quadrada para metalon, ponteira sapata metalon, ponteira para grade de metalon, sapata para metalon, sapata para tubo quadrado, tampa para metalon, tampa de metalon, tampa ponteira interna metalon, tampas plásticas metalon
- **Medidas no autocomplete (ordem aproximada de aparição):** 20x20, 50x30, 30x30, 30x20/20x30, 40x40, 50x50, 15x15, 80x80, 70x30, 100x100, 25x25, 60x60, 40x20/20x40, 60x40, 30x50, 30x40, 100x50, 150x50, 90x30, 80x40, 70x70, 100x40, 60x30, 50x20, 10x10
- **Intenção:** transacional (o usuário já sabe a medida)
- **Volume:** A no agregado (AC(76) só para "ponteira para metalon"); cada medida isolada é B.
- **Evidência:** Trends: "tampa para metalon" 3 vs "ponteira interna" 5, ou seja, "tampa" é sinônimo relevante. Anúncios: "Kit 1000 Tampa Plastica Metalon Ponteira Interna 20x20 Preta" (PopMov), "16 Tampas Plásticas Metalon 20x20 2cm Preta Ponteira Interna" (ML), "kit 100 Ponteira plástica interna 20x20 Para tudo Mesa Cadeira Balcão Móveis" (Amazon), "Kit 4 Ponteira Interna 20 x 20 PVC Rígido Preta para Metalon" (Varejão das Rodas).

### Cluster 3 — Ponteira / sapata para tubo redondo (cadeira tubular)
- **Termo principal:** ponteira para tubo redondo
- **Variações:** ponteira interna para tubo redondo, ponteira interna redonda, ponteira plástica para tubo redondo, ponteira para tubo redondo 1 polegada / 2 polegadas, ponteira para tubo 3/4, 7/8, 5/8, 1 1/4, 1 1/2, ponteira interna para tubo 7/8, ponteira interna para cadeira tubular 7/8, ponteira interna redonda 3/4, 7/8, 1, 1 1/4, 5/8, ponteira tubo 25mm, ponteira cadeira 25mm, ponteira para cadeira 30mm, ponteira interna plástica 19mm, sapata para tubo redondo, sapata para cadeira tubular (1 polegada), sapata cadeira tubo, sapata tubular, sapata cadeira 7/8, sapata para cadeira 3/4, sapata para tubo 3/4
- **Medidas mais citadas:** 7/8" (22,2 mm) > 3/4" (19,05 mm) > 1" (25,4 mm) > 5/8" (15,9 mm) > 1 1/4" (31,75 mm) > 1 1/2" e 2". Em milímetros: 19, 22, 25, 28 e 30 mm.
- **Intenção:** transacional
- **Volume:** M-A
- **Evidência:** ML: "Ponteira Interna Redonda 7/8 Pé Cadeira Ou Mesa - 100 Pçs", "Ponteira Pé Cadeira Interna Pvc Preta 7/8 22mm 2,2cm 100un" (Fariplas), "Ponteira Borracha Tubo 7/8 Pé Cadeira Redondo 20 Uni 2,4cm" (Carbi), "12un Sapata 5/8 Cadeira Tubo Ponteira Tubular Perfil Metalon". Completare: "Sapata para Cadeira Tubular 3/4" até 1"".
- **Padrão de título dos concorrentes:** medida em polegada **e** em mm ("7/8 22mm"). Replicar esse padrão nas tabelas e textos.

### Cluster 4 — Ponteira para cadeira (por aplicação)
- **Termo principal:** ponteira para cadeira / ponteira para pé de cadeira
- **Variações:** ponteira para cadeira de ferro (3/4, branca, quadrada, de borracha, interna de borracha), ponteira para cadeira tubular, ponteira para cadeira de alumínio, de metal, de madeira, retangular, quadrada, redonda, de bar, longarina, Tramontina, Allegra, Tolix, Eiffel, Eames, de área, de balanço, ponteira oval para cadeira, ponteira bola para cadeira, ponteira para cadeira e mesa, ponteira de cadeira, pezinho de cadeira (de ferro, tubular, quadrado, redondo, retangular), sapatilha para cadeira (de ferro)
- **Intenção:** comercial e reposição. "Onde comprar ponteira para cadeira" aparece no autocomplete.
- **Volume:** M-A (AC(82)). No Trends, "ponteira para cadeira" e "sapata para cadeira" empatam.
- **Fora de escopo dentro do cluster:** cadeira de rodas, de banho, de praia, escritório giratória (rodízio), cadeira de plástico (pé maciço), encosto de cadeira.

### Cluster 5 — Sapata para cadeira (por aplicação)
- **Termo principal:** sapata para cadeira
- **Variações:** sapata para pé de cadeira, sapata para cadeira de ferro, de madeira, tubular (1 polegada), de metal, de alumínio, quadrada, retangular, de plástico, sapata para cadeira 3/4, 7/8, 1, 1 1/4, sapata para mesa e cadeira, sapata cadeira tubo, sapata para cadeira Eames / Eames Eiffel / Charles Eames / Bertoia / Cesca / Allegra / Forsan / cadeira caixa, **sapata de borracha TPU para cadeira Eames (DSR)**, sapata antiderrapante para cadeira, sapata alta para cadeira, sapata para cadeira fixa
- **Intenção:** comercial/reposição
- **Volume:** M-A (AC(61), Trends ≈ "ponteira para cadeira")
- **Nota:** "sapata de borracha tpu para cadeira eames" mostra que **o consumidor já busca TPU** nesse contexto. É uma oportunidade de conteúdo de reposição para cadeiras de design (cuidado com marcas: dizer "compatível com" e não usar a marca como nome do produto).

### Cluster 6 — Sapata para pé de móvel (base lisa / plana)
- **Termo principal:** sapata para móveis / sapata para pé de mesa
- **Variações:** sapata para pé de mesa (quadrada, retangular, redonda, tubular, de madeira, de ferro), sapata para mesa de madeira (rústica), sapata para pé de sofá, sapata para sofá, sapata para poltrona, sapata para cama (de madeira), sapata para estante (de ferro/aço/madeira), sapata para rack, sapata para banqueta, sapata redonda para móveis, sapata quadrada para móveis, sapata retangular para móveis, sapata de plástico para móveis, sapata plástica móveis, sapata preta/branca para móveis, sapata pequena / grande para móveis, sapata de encaixe para móveis, sapata cadeira com pino, sapata para pé palito, pezinho para móvel, pezinho de borracha para móveis, pé de borracha para móveis/mesa/sofá, sapata de silicone para móveis/mesa/cadeira
- **Intenção:** comercial
- **Volume:** M (AC(72) para "sapata para moveis"; Trends 1-3)
- **Atenção:** boa parte do cluster é **niveladora/regulável/com prego/adesiva** (fora de escopo). A sapata lisa "com pescoço" corresponde a "sapata de encaixe para móveis" e "sapata com pino", que é o termo de mercado para haste que entra num furo do pé.

### Cluster 7 — Sapata com parafuso (pé de madeira / metal)
- **Termo principal:** sapata com parafuso
- **Variações:** sapata de borracha com parafuso, pé de borracha com parafuso, pezinho com parafuso, pezinho de borracha com parafuso, pezinho de mesa com parafuso, pezinho de cadeira com parafuso, sapata parafusada, sapata com furo (no meio), batente de borracha com parafuso, sapata para pé de madeira, sapata de borracha para mesa/cadeira/banco de madeira, sapata para cadeira de madeira
- **Intenção:** comercial
- **Volume:** B-M. "Sapata com parafuso" é B. "Pezinho/pé de borracha com parafuso" e "sapata para cadeira de madeira" são M.
- **Atenção:** "sapata com parafuso 1/4" é suporte de câmera e "sapata niveladora com parafuso" é nivelador. Diferencie: "furo escareado para parafuso de cabeça chata; parafuso não incluso".

### Cluster 8 — Ponteira oblonga / oval
- **Termo principal:** ponteira oblonga / ponteira para tubo oblongo
- **Variações:** ponteira para tubo oval, ponteira interna oblonga, ponteira interna oval, ponteira oblonga externa, ponteira oval para cadeiras, ponteira oval oblongo, ponteira 16x30, ponteira oblongo 16x30, tubo oblongo (16x30, 30x16, 50x20, 150x50), tubo oblongo medidas, tubo oblongo tabela
- **Medidas de mercado:** 16x30 (padrão dominante), 17x30, 20x47, 29x58 (58x29), 17x50, 30x60, 40x77, 16x40 e 18x40 (alumínio)
- **Intenção:** transacional/reposição
- **Volume:** B, mas com **baixa concorrência e oferta limitada** (só 2 ou 3 medidas por fabricante). É o melhor encaixe "sob medida".
- **Evidência:** "Ponteira Interna Oval Oblonga Pé De Cadeira 16x30mm 32un" (Casa das Borrachas, ML), "20 Ponteiras Oblongas 16x30 Para Pé Cadeira", "Ponteira Oval Oblongo 17 X 30 Pé Cadeira Ou Mesa" (Aciole), "Ponteira Plástica para Móveis Interna Oblonga" (Grupo Emar).
- **Atenção:** "ponteira oval" sozinho é **escapamento** (AC(49), quase tudo automotivo). Use sempre "ponteira oval para tubo" ou "para cadeira".

### Cluster 9 — Ponteira bola (sapata esférica)
- **Termo principal:** ponteira bola
- **Variações:** ponteira bola para cadeira, ponteira bola 7/8, ponteira bola 3/4, ponteira bola 28mm, ponteira bola oca, ponteira redonda interna bola (Cosmos), Ponteira Bola 1″ Interna (Fermaplast)
- **Intenção:** transacional
- **Volume:** B. "Sapata esférica" não tem volume (AC vazio), e "ponteira esférica" é automotiva (terminal de direção).
- **Recomendação:** nome visível "Sapata esférica (ponteira bola)".

### Cluster 10 — Sapata U / base trenó / meia-cana
- **Termo principal:** cadeira base trenó + sapata para base trenó
- **Variações:** cadeira base trenó, sapata meia cana (Completare: "Sapata Meia Cana Reta/Curva 7/8" a 1""), sapata para cadeira tubular (bases lineares), sapata para cadeira de arame (1/2" ou 7/16"), sapata para cadeira Eames Eiffel / Bertoia (base de arame), sapata deslizante para cadeira
- **Intenção:** reposição
- **Volume:** B. "Cadeira base trenó" está no autocomplete, mas é busca pela cadeira. A peça em si quase não tem volume e não há nome padronizado no mercado.
- **CONFLITO:** "sapata U" / "sapata em U" / "sapata u para mdf (15mm, 18mm, 25mm)" / "sapata u moveis" = **pé plástico em U para chapa de MDF**. Quem busca "sapata U" quer outra coisa. Ver a recomendação na seção (d).

### Cluster 11 — Ponteira plástica / B2B / fornecedores
- **Termo principal:** ponteiras plásticas
- **Variações:** ponteiras plásticas para tubos, ponteiras plásticas para móveis, ponteiras plásticas para metalon, fabricante de ponteiras plásticas, fábrica de ponteiras plásticas para móveis, indústria de ponteiras plásticas, fornecedor de ponteiras, ponteira serralheria, componentes para móveis (+ cidade: Caxias do Sul, Porto Alegre), ncm ponteiras plásticas / ncm ponteira interna / ncm sapata para móveis
- **Intenção:** B2B/comercial
- **Volume:** B-M
- **Evidência:** a Fermaplast titula a categoria "Fábrica de Ponteiras Plásticas para Tubos e Móveis" (H1 "Ponteiras plásticas para tubos e móveis"). As buscas por NCM indicam compradores PJ, o que favorece um FAQ B2B com NCM (confirmar com o contador; não inventar código).

### Cluster 12 — Informacional (medidas e uso)
- **Medir:** como medir pé de cadeira, como medir ponteira de cadeira, como medir metalon (quadrado), como medir espessura de metalon, como medir diâmetro de tubo, como medir o diâmetro externo/interno de um tubo, como medir tubo com paquímetro, como medir tubos em polegadas
- **Conversão/tabela:** medida de metalon (quadrado, retangular, para mesa), medidas de tubo de ferro (redondo, quadrado, em polegadas), tabela de medidas de tubo de ferro, tubo 7/8 em mm, tubo 3/4 em mm, tubo 1 polegada em mm, tubo 1 1/4 em mm, tubo 5/8 em mm, chapa 18 metalon quantos mm, espessura chapa 18 metalon, metalon chapa 18 ou 20, tubo oblongo medidas/tabela
- **Problema:** cadeira riscando o piso, cadeira arranhando piso, protetor de pé de cadeira para não fazer barulho, cadeira de rodinha risca porcelanato (fora de escopo)
- **Material:** tpu ou silicone (qual é melhor), tpu é borracha, tpu é plástico ou borracha
- **Montagem:** como fazer ponteira para cadeira (de ferro), como fazer uma ponteira para tubo de silicone (DIY: mostra a dor de não achar a medida)
- **Volume:** M para conversões e medidas de metalon (o público é amplo, inclusive serralheiros); B para "como medir ponteira".

### Cluster 13 — Diferenciais (sob medida / personalizada / 3D)
- **Termos:** ponteira sob medida, sapata sob medida, ponteira personalizada, ponteira impressa em 3D, ponteira TPU, sapata TPU, sapata sob encomenda, ponteira especial, ponteira para cadeira importada / antiga
- **Volume:** muito B. Nenhuma sugestão relevante no autocomplete: "sapata sob medida" só completa com "de freio", e "ponteira personalizada" com lápis/cadarço. **Exceção:** "sapata de borracha TPU para cadeira Eames".
- **Uso:** como modificador nos títulos ("… sob medida") e como argumento de venda, não como termo-alvo isolado.

### Cluster 14 — Adjacente: protetor / capa / deslizante (fora do produto, bom para conteúdo)
- **Termos:** protetor (para/de) pé de cadeira (silicone, quadrado, retangular, redondo, deslizante, feltro, transparente, tubular), capa para pé de cadeira, pezinho de cadeira de silicone, sapata de silicone para cadeira, deslizante para cadeira, sapata deslizante (com prego), feltro adesivo
- **Volume:** **A** ("protetor pé de cadeira" = 29 no Trends, de longe o maior da vizinhança)
- **Escopo:** a Baseforma não faz capa externa nem feltro. Só vale capturar com um guia ("ponteira interna x capa de silicone x feltro: qual protege mais o piso?") que direcione para a ponteira interna quando o pé é tubo aberto.

---

## (c) Mapeamento termo → página

**Regra de títulos:** `app/layout.js` usa o template `%s | Baseforma`, que acrescenta 11 caracteres. Os títulos abaixo **não incluem** esse sufixo e têm no máximo 49 caracteres, de modo que o total fica em até 60. As meta descriptions têm no máximo 155 caracteres. Contagens verificadas por script.

**Diretrizes gerais de cópia:**
- No primeiro parágrafo de cada família, use o termo principal **e** o sinônimo: "ponteira interna (também chamada de sapata ou tampa para tubo)".
- Inclua uma tabela de medidas populares com link "configurar esta medida", passando parâmetros pré-preenchidos se o configurador aceitar.
- Escreva as medidas em polegada e em mm ("7/8" (22,2 mm)").
- Mencione aplicações em texto corrido: cadeira de ferro, mesa tubular, banqueta, rack, estante, móvel de metalon.

### / (home)
- **Termos:** ponteira interna para tubo, sapata para móveis, ponteira para metalon, sapata para pé de cadeira, sob medida
- **Title:** Ponteiras e sapatas sob medida para móveis
- **Meta:** Ponteira interna para tubo redondo, metalon e oblongo, e sapatas para pés de móveis, feitas na medida do seu tubo em TPU. Sem pedido mínimo.
- **H1:** Ponteiras e sapatas sob medida para pés de móveis
- **H2 sugeridos:** "Ponteira interna para tubo redondo, quadrado e oblongo" · "Sapatas para pé de mesa, cadeira, sofá e poltrona" · "Como medir seu tubo" · "Para marcenarias, serralherias e fábricas de móveis"

### /catalogo
- **Termos:** ponteiras plásticas para móveis, tipos de ponteira, sapata para móveis
- **Title:** Catálogo de ponteiras e sapatas para móveis
- **Meta:** Ponteira interna para tubo e metalon, sapata lisa, com parafuso, ponteira bola e sapata para base trenó. Informe a medida e veja o preço na hora.
- **H1:** Catálogo de ponteiras e sapatas sob medida

### /configurar/ponteira-interna-tubo (categoria; slug mantido)
- **Termos:** ponteira interna, ponteira para tubo, ponteira interna para tubo, tampa para tubo, sapata para tubo
- **Title:** Ponteira interna para tubo e metalon sob medida
- **Meta:** Ponteira interna (sapata) para tubo redondo, metalon e tubo oblongo. Informe a medida externa e a parede do tubo e receba o encaixe certo em TPU.
- **H1:** Ponteira interna para tubo, sob medida
- **Nome visível da categoria:** "Ponteira interna para tubo" (em vez de "Sapata interna tubos")

### /configurar/sapata-base-lisa
- **Termos:** sapata para móveis, sapata para pé de mesa, sapata para pé de sofá, sapata redonda/quadrada para móveis, sapata de encaixe (com pino)
- **Title:** Sapata para pé de móvel redonda ou quadrada
- **Meta:** Sapata lisa para pé de mesa, sofá, poltrona e banqueta, com ou sem pino de encaixe. De 3 a 150 mm, em TPU preto, branco, cinza ou marrom.
- **H1:** Sapata lisa para pé de móvel, sob medida

### /configurar/sapata-com-parafuso
- **Termos:** sapata com parafuso, pé de borracha com parafuso, sapata para pé de madeira, sapata para cadeira de madeira
- **Title:** Sapata com parafuso para pé de madeira e metal
- **Meta:** Sapata redonda ou quadrada com furo central escareado para parafuso, para pés de cadeira, mesa e poltrona de madeira ou metal. Medida de 12 a 150 mm.
- **H1:** Sapata com furo para parafuso, sob medida

### /configurar/sapata-esferica
- **Termos:** ponteira bola, ponteira bola para cadeira, ponteira bola 7/8
- **Title:** Ponteira bola (sapata esférica) para tubo redondo
- **Meta:** Sapata esférica, a ponteira bola, para tubo redondo de 20 a 75 mm. Encaixe interno por pressão ajustado à parede do tubo. TPU em 4 cores.
- **H1:** Sapata esférica (ponteira bola) para tubo redondo

### /configurar/sapata-u (se a rota existir; o slug da categoria é `sapata-u`)
- **Termos:** cadeira base trenó, sapata meia cana, sapata para cadeira tubular de base reta, sapata para cadeira de arame
- **Title:** Sapata U para cadeira base trenó e tubo redondo
- **Meta:** Sapata em U (meia-cana) que encaixa por pressão no tubo da base trenó ou balanço. Tubo de 5 a 60 mm, com ou sem haste. Protege o piso.
- **H1:** Sapata U para base trenó e tubo redondo

### /familias/sapata-tubo-redondo
- **Termos:** ponteira para tubo redondo, ponteira interna redonda, ponteira 7/8, ponteira para cadeira tubular, sapata para cadeira tubular, ponteira para cadeira de ferro
- **Title:** Ponteira interna para tubo redondo sob medida
- **Meta:** Ponteira interna para pé de cadeira e mesa tubular: 5/8", 3/4", 7/8", 1" ou qualquer diâmetro, ajustada à parede do tubo. TPU, sem pedido mínimo.
- **H1:** Ponteira interna para tubo redondo
- **Tabela na página:** 5/8" 15,9 · 3/4" 19,05 · 7/8" 22,2 · 1" 25,4 · 1 1/8" 28,6 · 1 1/4" 31,75 · 1 1/2" 38,1 · 2" 50,8 mm
- **Termos no texto:** "sapata para cadeira tubular", "ponteira para cadeira de ferro", "ponteira para pé de mesa tubular", "pezinho de cadeira"

### /familias/sapata-tubo-quadrado
- **Termos:** ponteira para metalon, ponteira interna metalon (+ 20x20/30x30/50x30/40x40/50x50), ponteira para tubo quadrado e retangular, tampa para metalon, sapata para metalon
- **Title:** Ponteira para metalon e tubo quadrado sob medida
- **Meta:** Ponteira interna para metalon 20x20, 30x30, 50x30, 40x40 ou qualquer medida até 150 mm, quadrado ou retangular, ajustada à parede. TPU, a partir de 1 un.
- **H1:** Ponteira interna para metalon quadrado e retangular
- **Termos no texto:** "tampa para metalon", "ponteira para tubo retangular", "sapata para metalon", "ponteira para pé de mesa quadrada", "chapa 18 / chapa 20"

### /familias/sapata-tubo-oblongo
- **Termos:** ponteira oblonga, ponteira para tubo oblongo, ponteira para tubo oval, ponteira 16x30, ponteira oval para cadeira
- **Title:** Ponteira para tubo oblongo e oval sob medida
- **Meta:** Ponteira oblonga para tubo 16x30, 20x47, 29x58 ou a medida exata do seu perfil oval. Ideal para reposição em cadeira importada. TPU, sem pedido mínimo.
- **H1:** Ponteira interna para tubo oblongo (oval)

### /familias/sapata-lisa-redonda
- **Termos:** sapata redonda para móveis, sapata para pé de sofá/poltrona, sapata para pé de mesa redonda, sapata com pino
- **Title:** Sapata redonda para pé de móvel sob medida
- **Meta:** Sapata lisa redonda para pé de sofá, poltrona, mesa e banqueta, de 3 a 150 mm de diâmetro, com ou sem pino de encaixe. TPU em 4 cores.
- **H1:** Sapata lisa redonda para pé de móvel

### /familias/sapata-lisa-quadrada
- **Termos:** sapata quadrada para móveis, sapata para pé de mesa quadrada/retangular, sapata retangular para móveis
- **Title:** Sapata quadrada para pé de móvel sob medida
- **Meta:** Sapata lisa quadrada ou retangular para pé de mesa, banqueta, estante e base metálica, de 3 a 150 mm por lado, com ou sem pino. TPU em 4 cores.
- **H1:** Sapata lisa quadrada ou retangular para pé de móvel

### /familias/sapata-com-parafuso-redonda
- **Termos:** pé de borracha com parafuso, sapata redonda com parafuso, sapata para pé de cadeira de madeira
- **Title:** Sapata redonda com parafuso para pé de móvel
- **Meta:** Sapata redonda com furo escareado para parafuso, para pé de cadeira, mesa e poltrona de madeira ou metal. Diâmetro de 12 a 150 mm. Parafuso não incluso.
- **H1:** Sapata redonda com parafuso para pé de madeira

### /familias/sapata-com-parafuso-quadrada
- **Termos:** sapata quadrada com parafuso, pezinho com parafuso, sapata para mesa de madeira
- **Title:** Sapata quadrada com parafuso para pé de móvel
- **Meta:** Sapata quadrada ou retangular com furo central para parafuso, para pés de madeira ou metal de mesa, cadeira e poltrona. 12 a 150 mm. Parafuso não incluso.
- **H1:** Sapata quadrada com parafuso para pé de madeira

### /familias/sapata-esferica
- **Termos:** ponteira bola, ponteira bola para cadeira, ponteira bola 7/8 / 3/4 / 28mm
- **Title:** Ponteira bola para tubo redondo sob medida
- **Meta:** Sapata esférica (ponteira bola) para cadeira e mesa tubular. Encaixe interno por pressão em tubo de 20 a 75 mm, ajustado à parede. TPU em 4 cores.
- **H1:** Sapata esférica (ponteira bola) para tubo redondo

### /familias/sapata-u
- **Termos:** cadeira base trenó, sapata meia cana, sapata para cadeira de base reta, sapata para cadeira de arame / Eiffel / Bertoia
- **Title:** Sapata U para cadeira base trenó sob medida
- **Meta:** Sapata em U (meia-cana) que encaixa por pressão no tubo horizontal de cadeiras base trenó e balanço. Tubo de 5 a 60 mm, com ou sem haste.
- **H1:** Sapata U para cadeira base trenó
- **Primeira frase obrigatória:** deixar claro que **não é a sapata U para chapa de MDF**: "Para tubo redondo de cadeiras com base trenó, e não para chapa de MDF."

### /como-funciona
- **Termos:** como comprar ponteira sob medida, como medir tubo para ponteira
- **Title:** Como comprar ponteira e sapata sob medida
- **Meta:** Escolha o modelo, informe a medida externa e a parede do tubo, confira o preço na hora e receba a peça produzida sob encomenda. Veja o passo a passo.
- **H1:** Como funciona: da medida do tubo à entrega

### /processo
- **Termos:** ponteira impressa em 3D, TPU, TPU é plástico ou borracha
- **Title:** Ponteiras em TPU feitas por impressão 3D
- **Meta:** Por que TPU: plástico flexível que segura no tubo e protege o piso. Veja como cada ponteira e sapata é modelada na sua medida e impressa em 3D.
- **H1:** Material e processo: TPU impresso em 3D sob demanda

### /projeto-especial
- **Termos:** ponteira personalizada, fabricante de ponteiras plásticas, ponteira fora de linha, ponteira para cadeira importada, ponteiras para serralheria/marcenaria
- **Title:** Ponteira ou sapata personalizada para seu móvel
- **Meta:** Precisa de uma ponteira fora de catálogo, de uma peça de reposição que saiu de linha ou de um lote para sua fábrica? Envie medidas ou foto e orçamos.
- **H1:** Projeto especial: ponteiras e sapatas personalizadas

### /faq
- **Termos:** como medir pé de cadeira, ponteira interna ou externa, ponteira soltando
- **Title:** Dúvidas sobre ponteiras e sapatas para móveis
- **Meta:** Como medir o tubo, a diferença entre ponteira interna e externa, cores, prazo, frete e compra em quantidade: respostas sobre ponteiras e sapatas.
- **H1:** Perguntas frequentes sobre ponteiras e sapatas

---

## (d) Nomenclatura: "ponteira" ou "sapata"?

### Veredito
- **Encaixe dentro do tubo** (redondo, quadrado, oblongo, esférica): o público busca **"ponteira"**. Evidência:
  - Trends: "ponteira interna" 5 e "ponteira para tubo" 4, contra "sapata para tubo" 1.
  - Autocomplete: "ponteira interna" gerou 109 sugestões; "ponteira para metalon", 76; "ponteira para tubo", 68.
  - Todos os fabricantes e quase todos os anúncios usam "ponteira".
  - "Sapata" aparece como sinônimo secundário ("sapata para metalon", "sapata para cadeira tubular", "sapata cadeira 7/8").
- **Pé plano / base de móvel** (lisa e com parafuso): o público busca **"sapata"** ("sapata para móveis", "sapata para pé de mesa", "sapata para cadeira de madeira"). "Ponteira" aqui soa errado.
- **Para cadeira em geral:** empate. Use os dois termos.
- **"Sapata interna"** é ruim: o autocomplete devolve perfilado e eletrocalha (38x38, 4 furos).

### Nomes visíveis recomendados
| Atual | Recomendado (nome visível/H1) | Nome curto (cards/menu) |
|---|---|---|
| Sapata interna tubos | Ponteira interna para tubo | Ponteira para tubo |
| Tubo redondo / Sapata interna tubo redondo | Ponteira interna para tubo redondo | Tubo redondo |
| Tubo quadrado / Sapata interna tubo quadrado | Ponteira interna para metalon (tubo quadrado e retangular) | Metalon / tubo quadrado |
| Tubo oblongo | Ponteira interna para tubo oblongo (oval) | Tubo oblongo / oval |
| Sapata lisa | Sapata lisa para pé de móvel | Sapata lisa |
| Lisa redonda / Lisa quadrada | Sapata lisa redonda / Sapata lisa quadrada | igual |
| Haste / pescoço (opção) | "Com pino de encaixe" (explicar: haste que entra num furo do pé) | Com pino |
| Sapata com parafuso | Sapata com parafuso (furo escareado) | Com parafuso |
| Sapata esférica | Sapata esférica (ponteira bola) | Ponteira bola |
| Sapata U | Sapata U para base trenó | Base trenó |

- Em textos e microcópia, use a fórmula **"ponteira interna (sapata)"** na primeira menção e "ponteira" depois. Os nomes de produto em SKU, pedidos e admin podem continuar "sapata". A mudança é só de rótulo público e SEO.
- No dado estruturado `Product.category`, troque "Sapata para mobiliário" por "Ponteira para tubo" nas famílias de tubo. Nas demais, mantenha "Sapata para móveis".
- Mencione "tampa para tubo/metalon" uma vez nas famílias de tubo quadrado e redondo. É sinônimo com volume ("tampa para metalon" = 3 no Trends).

### Vale mudar slugs?
**Recomendação: não mudar slugs agora.**
- A categoria de tubo **já** usa `ponteira-interna-tubo`.
- As famílias `sapata-tubo-redondo`, `sapata-tubo-quadrado` e `sapata-tubo-oblongo` contêm "tubo redondo/quadrado/oblongo", que é a parte mais específica da busca. O peso da palavra na URL é pequeno frente a title, H1 e conteúdo.
- Mudar exige 301 e risco operacional (sitemap, links internos, carrinho, pedidos e e-mails que referenciem a URL, dados estruturados).
- **Se** um dia houver reestruturação, a ordem de ganho seria:
  1. `sapata-tubo-quadrado` → `ponteira-para-metalon`, o cluster mais forte, com "metalon" fora da URL atual
  2. `sapata-tubo-redondo` → `ponteira-tubo-redondo`
  3. `sapata-esferica` → `ponteira-bola`
  4. `sapata-u` → `sapata-base-treno`

  Sempre com 301 permanente em `next.config` e atualização do sitemap. O ganho esperado é pequeno a moderado, e não justifica o risco antes de o site ter tráfego orgânico mensurável no Search Console.
- **Ação de baixo custo no lugar disso:** cobrir "metalon" no title, H1, tabela e alt text da família `sapata-tubo-quadrado`.

---

## (e) Tabela de medidas comuns (para exibir nas páginas)

### Tubo redondo (polegada → mm, diâmetro externo)
| Nominal | Ø externo (mm) | Uso típico em móveis | Citado no autocomplete/anúncios |
|---|---|---|---|
| 1/2" | 12,7 | cadeira de arame, estruturas leves | ponteira 1/2, cadeira arame 1/2" |
| 5/8" | 15,88 | cadeira tubular leve, banqueta | ponteira 5/8, sapata 5/8 cadeira |
| 3/4" | 19,05 | **cadeira de ferro / tubular, banqueta** | muito (ponteira 3/4 interna, cadeira 3/4) |
| 7/8" | 22,23 | **cadeira tubular, mesa** (o mais citado para cadeira) | muito (ponteira 7/8 interna, cadeira tubular 7/8) |
| 1" | 25,4 | cadeira, mesa, banqueta | muito (ponteira 1 polegada, tubo 25mm) |
| 1 1/8" | 28,58 | cadeira/mesa (o default da sapata esférica no site é 28,9) | ponteira bola 28mm, sapata silicone 28mm |
| 1 1/4" | 31,75 | cadeira de área, mesa, pé de banqueta | ponteira para cadeira 1 1/4, tubo 32mm |
| 1 1/2" | 38,1 | mesa, bancada, estrutura | ponteira 1 1/2 interna |
| 2" | 50,8 | mesa, estrutura, pé central | ponteira para tubo redondo 2 polegadas |
| 2 1/2" / 3" | 63,5 / 76,2 | pé central de mesa, estrutura | ponteira interna 2.1/2, 3 polegadas |

### Metalon quadrado e retangular (mm, externo)
**Mais citados (prioridade na tabela):** **20x20, 30x30, 50x30, 40x40, 30x20, 50x50, 15x15, 25x25, 40x20, 60x40, 30x50, 80x80, 100x100, 70x30, 60x60.**
Também aparecem: 10x10, 30x40, 50x20, 60x30, 70x70, 80x40, 90x30, 100x40, 100x50 e 150x50. Todos ficam dentro do limite de 150 mm do configurador. **As medidas grandes (100x50, 150x50, 100x100) têm pouca oferta e boa aderência ao "sob medida".**

### Tubo oblongo (mm)
**16x30 (padrão de mercado)**, 17x30, 20x47, 29x58, 17x50, 30x60, 40x77, 16x40 e 18x40 (perfis de alumínio). O default atual do site é 36x18. Vale exibir 16x30 como exemplo principal.

### Espessura de parede (chapa) — por que o site pede a parede
| Chapa (bitola) | Espessura aprox. (mm) | Observação |
|---|---|---|
| 20 | 0,90 | metalon leve, comum em 20x20/30x20 |
| 18 | 1,20 | a mais comum em móveis ("chapa 18 metalon quantos mm" está no autocomplete) |
| 16 | 1,50 | default de parede do site (1,5) |
| 14 | 1,90–2,00 | "chapa grossa"; a Completare tem até a categoria "Ponteira Interna Chapa Grossa" |
| 13 / 12 | 2,25 / 2,65 | estrutural/serralheria pesada |

Sugestão de microcópia: "A mesma medida externa pode ter paredes diferentes, e é por isso que ponteiras de prateleira soltam ou não entram. Informe a parede e a ponteira sai com o vão interno exato."

(Fonte das conversões: tabela de tubo industrial redondo da Fabricadoprojeto (fabricadoprojeto.com.br) e anúncios. As bitolas de chapa seguem a tabela MSG usual no Brasil. **Confirme os arredondamentos antes de publicar.**)

---

## (f) Ideias de páginas de conteúdo (/guias/…)

1. **/guias/como-medir-tubo-para-ponteira**
   - **Alvo:** como medir pé de cadeira, como medir ponteira de cadeira, como medir metalon, como medir diâmetro de tubo, como medir espessura de metalon
   - **Seções:**
     1. O que medir (diâmetro ou lados externos e parede)
     2. Com paquímetro
     3. Sem paquímetro (régua, fio ou papel, e por que isso é menos preciso)
     4. Medindo a parede quando o tubo está fechado por uma ponteira velha
     5. Tubo redondo × quadrado × oblongo
     6. Erros comuns (medir a ponteira velha em vez do tubo, confundir polegada nominal)
     7. CTA para o configurador
2. **/guias/tabela-medidas-tubo-metalon**
   - **Alvo:** medida de metalon, medidas de tubo de ferro, tubo 7/8 em mm, tubo 3/4 em mm, tubo 1 polegada em mm, chapa 18 metalon quantos mm
   - **Seções:**
     1. Tabela polegada → mm
     2. Medidas de metalon quadrado e retangular
     3. Tubo oblongo
     4. Chapa × espessura
     5. Qual ponteira para cada medida (com links pré-preenchidos)
3. **/guias/ponteira-interna-ou-externa**
   - **Alvo:** ponteira interna e externa, ponteira interna ou externa (FAQ da Fermaplast)
   - **Seções:**
     1. Diferença visual
     2. Quando usar cada uma
     3. Acabamento e segurança (borda viva do tubo)
     4. Por que a Baseforma faz interna
     5. Quando a externa é inevitável (tubo amassado, maciço)
4. **/guias/cadeira-riscando-o-piso**
   - **Alvo:** cadeira riscando o piso, cadeira arranhando piso, protetor pé de cadeira (adjacente de alto volume), pé de cadeira fazendo barulho
   - **Seções:**
     1. Por que risca (tubo aberto, ponteira gasta ou caída, rebarba)
     2. Opções: ponteira interna, capa de silicone, feltro, deslizante (prós e contras honestos)
     3. Porcelanato × laminado × madeira
     4. Quando trocar a ponteira
     5. CTA
5. **/guias/como-trocar-ponteira-de-cadeira**
   - **Alvo:** como trocar ponteira de cadeira, como tirar ponteira de cadeira, ponteira soltando/caindo
   - **Seções:**
     1. Retirar a ponteira velha (alicate, chave de fenda)
     2. Limpar a rebarba
     3. Medir
     4. Encaixar com martelo de borracha
     5. O que fazer se a ponteira fica folgada (parede fina) ou não entra (parede grossa)
6. **/guias/sapata-para-cadeira-base-treno**
   - **Alvo:** cadeira base trenó, sapata meia cana, sapata para cadeira de arame / Eiffel
   - **Seções:**
     1. O que é base trenó e balanço
     2. Por que a ponteira comum não serve (tubo horizontal)
     3. Sapata U / meia-cana: como mede (diâmetro do tubo e comprimento)
     4. Com ou sem haste
     5. Cadeiras de arame
     6. CTA para /familias/sapata-u
7. **/guias/tpu-silicone-ou-borracha**
   - **Alvo:** tpu ou silicone qual é melhor, tpu é borracha, tpu é plástico ou borracha
   - **Seções:**
     1. O que é TPU
     2. TPU × silicone × borracha × PVC/polietileno (dureza, aderência ao tubo, marca no piso, durabilidade)
     3. Por que TPU para ponteira
     4. Cuidados
8. **/guias/ponteira-para-tubo-oblongo**
   - **Alvo:** tubo oblongo medidas, ponteira oblonga 16x30, ponteira para tubo oval
   - **Seções:**
     1. Oblongo × oval × retangular arredondado
     2. Medidas de mercado
     3. Como medir largura e altura
     4. Cadeiras importadas e de escritório antigas
     5. CTA
9. **/guias/ponteiras-para-serralheria-e-marcenaria** (B2B)
   - **Alvo:** fabricante de ponteiras plásticas, fornecedor de ponteiras, ponteiras plásticas para móveis, ponteira serralheria
   - **Seções:**
     1. Quando compensa o sob medida × a injetada de prateleira (lotes pequenos, protótipo, linha autoral, medida rara)
     2. Cores e acabamento
     3. Prazos
     4. Nota fiscal e NCM (confirmar)
     5. Projeto especial
10. **/guias/sapata-para-pe-de-madeira**
    - **Alvo:** sapata para pé de madeira, sapata para cadeira de madeira, pé de borracha com parafuso, sapata para mesa de madeira rústica
    - **Seções:**
      1. Opções: com parafuso, com pino de encaixe, adesiva, com prego (o que a Baseforma faz e o que não faz)
      2. Como escolher o tamanho
      3. Instalação com parafuso de cabeça chata

**Fase 2 (opcional): landing pages por medida.** Exemplos: "ponteira para metalon 20x20", "50x30", "30x30", "40x40" e "ponteira 7/8 para cadeira". Só faça se cada página tiver conteúdo único (paredes comuns daquela medida, preço "a partir de", foto, configurador pré-preenchido). Caso contrário, vira conteúdo raso. Comece pela tabela com âncoras nas famílias.

---

## (g) Perguntas reais do público (para FAQs por família)

Origem: autocomplete em forma de pergunta, FAQ da Fermaplast ("Qual a diferença entre ponteira interna e externa?", "Como saber a medida certa da ponteira?", "Vende ponteiras no atacado?") e dúvidas recorrentes em anúncios (encaixe 18/20 mm, chapa grossa, altura).

### Geral / FAQ
- Qual a diferença entre ponteira interna e externa?
- Como saber a medida certa da ponteira? / Como medir o pé da cadeira?
- Ponteira e sapata são a mesma coisa?
- A ponteira risca o piso? Protege porcelanato e piso laminado?
- TPU é plástico ou borracha? TPU ou silicone, qual é melhor?
- Vocês vendem no atacado / para fábrica? Existe quantidade mínima?
- Onde comprar ponteira para cadeira em medida que não acho na loja?
- Qual o prazo de produção e entrega?
- Quais cores existem? (preto, branco, cinza, marrom)

### Ponteira para tubo redondo
- Qual ponteira serve em tubo 7/8? E 3/4? (com tabela pol → mm)
- Meço o diâmetro interno ou externo do tubo?
- Minha ponteira fica solta e cai. Por quê? (parede fina)
- A ponteira não entra no tubo. E agora? (parede grossa, rebarba de solda)
- Serve para cadeira de ferro antiga / cadeira Tramontina / cadeira de bar?

### Ponteira para metalon (quadrado/retangular)
- Ponteira para metalon 20x20 serve em chapa 18 e chapa 20?
- Faz ponteira para metalon retangular 50x30 / 40x20 / 100x50?
- Qual a diferença entre ponteira, tampa e sapata para metalon?
- A ponteira aguenta mesa pesada / bancada?

### Ponteira para tubo oblongo
- Como medir tubo oblongo/oval?
- Vocês fazem ponteira oblonga 16x30? E medidas diferentes de 16x30?
- Serve em cadeira de escritório fixa / cadeira importada?

### Sapata lisa
- Qual a diferença entre sapata com e sem pino?
- Como fixar a sapata lisa (cola, pino em furo)?
- Serve em pé de sofá / poltrona / estante?
- A sapata nivela o móvel? (não; ver niveladores, fora de escopo)

### Sapata com parafuso
- O parafuso vem junto? (não)
- Qual parafuso usar (diâmetro, cabeça chata)?
- Serve em pé de madeira e de metal?

### Ponteira bola (esférica)
- Para que serve a ponteira bola? (cadeiras inclinadas, design)
- Qual medida de tubo atende? (20 a 75 mm)

### Sapata U (base trenó)
- Serve para chapa de MDF? (não, é para tubo redondo)
- Como saber o diâmetro do tubo da base trenó?
- Quantas sapatas usar por cadeira?
- Com haste ou sem haste: qual escolher?

---

## (h) Termos a evitar ou fora de escopo

### Fora do produto, mas úteis em conteúdo (explicar e redirecionar)
- **Sapata niveladora / pé nivelador / sapata regulável / sapata com rosca** (1/4, 5/16, 3/8): volume alto, mas o site não faz. Citar em FAQ ("não fazemos niveladores com rosca").
- **Protetor de pé de cadeira de silicone, capa para pé de cadeira, feltro adesivo, deslizante, sapata deslizante com prego:** adjacente de **alto** volume. Só capturar via guia comparativo.
- **Ponteira externa:** não oferecida. Explicar a diferença no guia.
- **Rodízio, sapata para cadeira giratória/de escritório (rodinha), ponteira para rodízio:** fora de escopo.
- **Sapata U para MDF / sapata em U para móveis (15, 18 ou 25 mm):** produto diferente. Desambiguar na página da Sapata U.
- **Sapata com prego / sapata adesiva / pezinho adesivo:** fora de escopo.

### Ambíguos: nunca usar sem qualificador
- **"sapata" sozinha / "sapata 30x30" / "sapata 40x40":** fundação de construção ("sapata 40x40x30 preço", "sapata para pilar"). Use "ponteira para metalon 40x40".
- **"sapata interna" / "sapata quadrada 38x38":** perfilado de eletrocalha.
- **"sapata para andaime", "sapata de freio", "sapata de máquina de costura", "sapata de ferro de passar", "sapata para escada de alumínio", "sapata para elevador automotivo":** outros mercados.
- **"ponteira" sozinha / "ponteira oval" / "ponteira 2 polegadas" / "ponteira 1 1/2":** escapamento.
- **"ponteira 3/4", "ponteira 7/8 articulada", "ponteira de borracha" (sozinha), "ponteira 22mm":** muleta, bengala, andador.
- **"ponteira 19mm", "ponteira 28mm", "ponteira 5/8 externa pvc branco":** varão de cortina, banner.
- **"ponteira esférica":** terminal de direção automotivo.
- **"ponteira de silicone":** ballet, óculos, seringa.
- **"ponteira personalizada":** lápis, cadarço.
- **"ponteira branca / preta / cinza / marrom":** faixa de artes marciais. Cor só como atributo ("ponteira interna preta").
- **"terminal para tubo":** elétrica (conduíte).
- **Ferramentas:** "ponteira para parafusadeira", "martelete", "riscadeira", "roçadeira", "ultrassom odontológico".

### Termos de marca de terceiros
"Eames", "Eiffel", "Bertoia", "Tolix", "Tramontina", "Allegra" e "Cesca" aparecem no autocomplete. Se usados, apenas como compatibilidade descritiva ("compatível com cadeiras estilo Eiffel"), nunca no nome do produto nem como afirmação de peça original.

---

## Apêndice — Títulos de concorrentes e marketplaces (padrões observados)

| Fonte | Exemplo de título/H1 | Padrão |
|---|---|---|
| Fermaplast (fabricante, Curitiba) | Title "Fábrica de Ponteiras Plásticas para Tubos e Móveis"; H1 "Ponteiras plásticas para tubos e móveis"; produtos "Ponteira 7/8″ Interna Reta", "Ponteira 16×30 mm Interna Oblonga", "Ponteira Bola 1″ Interna", "Ponteira 30x30mm Interna Reta" | Ponteira + medida + interna/externa + forma; FAQ "interna x externa", "medida certa", "atacado"; "sapata" só no menu |
| Cosmos Artefatos (MG) | "Ponteira redonda interna 7/8″", "Ponteira quadrada interna 20X20", "Ponteira oblonga interna 16X30 abaulada", "Ponteira redonda interna bola 3/4″" | Ponteira + forma + interna + medida |
| Codevenplast | "Ponteira Retangular Interna"; redondas abauladas de 5/8" a 3", oblongas 16x30, 20x47, 29x58 | idem |
| Completare (loja) | "Sapata para Cadeira Tubular 3/4" até 1" – Kit 12", "Sapata Meia Cana Reta 7/8" a 1" para Cadeira Tubular", "Sapata para Cadeira Arame 1/2" ou 7/16"", "Ponteira Interna 20x20mm p/ Tubo Metalon"; menus "Ponteira Interna", "Ponteira Interna Chapa Grossa" | Usa **sapata** para o que vai na cadeira e **ponteira** para o que vai no metalon |
| PopMov | "Kit 1000 Tampa Plastica Metalon Ponteira Interna 20x20 Preta" | tampa + metalon + ponteira interna + medida + cor |
| Mercado Livre (vários) | "Ponteira Interna Redonda 7/8 Pé Cadeira Ou Mesa - 100 Pçs"; "Ponteira Pé Cadeira Interna Pvc Preta 7/8 22mm 2,2cm 100un"; "16 Tampas Plásticas Metalon 20x20 2cm Preta Ponteira Interna"; "Ponteira Protetora Pé De Cadeira Mesa Banqueta 2x2cm - 50 Pç"; "12un Sapata 5/8 Cadeira Tubo Ponteira Tubular Perfil Metalon"; "Ponteira Interna Oval Oblonga Pé De Cadeira 16x30mm 32un"; "8 Ponteira Interna Plástica 50x30 P/ Pé Cadeira Tubo Metalon" | Empilha sinônimos (ponteira + sapata + tampa), medida em pol + mm, aplicação ("pé cadeira ou mesa"), material, cor, quantidade |
| Amazon | "kit 100 Ponteira plástica interna 20x20 Para tudo Mesa Cadeira Balcão Móveis" | kit + ponteira + medida + aplicações |
| Magalu | "Kit 8 sapata/ponteira de cadeira 7/8 pol", "Kit 8 Ponteiras Tampas Angular 1.7/8 polegadas" | sinônimos com barra |
| Telhanorte / MadeiraMadeira | "Ponteira 7/8 Externa Preto Talentos"; "Ponteira Pé Cadeira Pvc Externa 3/4 19mm Preta (100pc) Suplastine" | ponteira + medida + tipo + cor + marca |
| Essentra Components | "ponteiras de tubos", "insertos de tubos", "patins", "insertos e patins de tubos ovais"; vende ponteira "com aletas" para várias espessuras | terminologia técnica (inserto, patim) |

**Lições para a Baseforma:**
- Ninguém vende por medida real com parede. Todos vendem a medida nominal em kits de 4 a 1000 peças. O diferencial ("a partir de 1 unidade, medida e parede exatas, 4 cores") não aparece nos títulos de nenhum concorrente.
- Os títulos dos líderes começam com **"Ponteira"** e trazem **medida + interna + aplicação**. Replicar a estrutura nos H1 e H2, sem o empilhamento excessivo de marketplace.
- O termo "chapa grossa" (Completare) confirma a dor da parede do tubo. Use a linguagem do serralheiro: "chapa 18", "chapa grossa".

## Fontes consultadas
- Google Autocomplete (suggestqueries.google.com, pt-BR/BR) e Google Trends (trends.google.com, BR, 5 anos)
- [Fermaplast — Ponteiras para móveis](https://fermaplast.com.br/ponteiras-para-moveis/) · [Fermaplast — categoria](https://fermaplast.com.br/produto-categoria/ponteiras-plasticas/)
- [Cosmos — Ponteiras móveis tubulares](https://cosmosmg.com.br/ponteiras-moveis-tubulares/)
- [Codevenplast — produtos](https://www.codevenplast.com.br/produtos.php)
- [Completare — Sapata Meia Cana Reta 7/8" a 1"](https://www.completare.com.br/sapata-para-cadeira-tubular-meia-cana-reta-78-ate-1-kit-12-unidades) · [Sapata Cadeira Tubular 3/4" a 1"](https://www.completare.com.br/sapata-para-cadeira-tubular-34-ate-1-kit-12-unidades) · [Ponteira Interna 20x20 p/ Metalon](https://www.completare.com.br/ponteira-interna-20x20mm-tubo-metalon-100-pecas)
- [PopMov — Kit 1000 Ponteira Interna 20x20](https://www.popmov.com.br/componentes-para-cadeiras/demais-componentes/kit-1000-ponteira-interna-20x20-preta-popmov-1603)
- [Amazon — kit 100 Ponteira plástica interna 20x20](https://www.amazon.com.br/Ponteira-pl%C3%A1stica-interna-Cadeira-Balc%C3%A3o/dp/B0DBWYT55S)
- [Varejão das Rodas — Kit 4 Ponteira Interna 20x20](https://www.varejaodasrodaserodizios.com.br/manipulos-sapatas-buchas-e-ponteiras/ponteiras/quadradas/kit-4-ponteira-interna-20-x-20-pvc-rigido-preta-para-metalon)
- [Grupo Emar — Ponteira interna oblonga](https://grupo.emar.com.br/ponteira-plastica-para-moveis-interna-oblonga-prata)
- [Essentra — Pés, ponteiras e batentes (PDF)](https://www.essentracomponents.com.br/set-ap/08_Pes-Ponteiras-e-Batentes.pdf)
- [Mercado Livre — Ponteira Protetora Pé De Cadeira 2x2cm](https://produto.mercadolivre.com.br/MLB-1733416346-ponteira-protetora-pe-de-cadeira-mesa-banqueta-2x2cm-50-pc-_JM) · [16 Tampas Plásticas Metalon 20x20](https://produto.mercadolivre.com.br/MLB-2733520050-16-tampas-plasticas-metalon-20x20-2cm-preta-ponteira-interna-_JM) · [12un Sapata 5/8 Cadeira Tubo](https://produto.mercadolivre.com.br/MLB-3872356427-12un-sapata-58-cadeira-tubo-ponteira-tubular-perfil-metalon-_JM)
- [MadeiraMadeira — Ponteira Pé Cadeira PVC Externa 3/4](https://www.madeiramadeira.com.br/ponteira-pe-cadeira-pvc-externa-3-4-19mm-preta-100pc-suplastine-ponteira-3-4-976980364.html?seller=430)
- [Telhanorte — Ponteira 7/8 Externa](https://www.telhanorte.com.br/ponteira-78-externa-preto-talentos-542245/p)
- [Fabricadoprojeto — Tabela de tubo industrial redondo](https://www.fabricadoprojeto.com.br/en/tabelas-de-laminados-trefilados-e-itens-comerciais/tabelas-fapro-tubo-industrial-redondo/)
- [QIDI — Pés de TPU para móveis](https://qidi3d.com/pt/blogs/print-lab/tpu-furniture-feet-stop-sliding)
