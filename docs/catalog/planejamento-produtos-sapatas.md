# Planejamento de produtos: sapatas TPU

Data: 2026-04-17  
Base: `docs/catalog/pesquisa-mercado-sapatas-plasticas.md`

## Objetivo

Definir quais familias de sapatas devem ser desenhadas primeiro, evitando um catalogo inchado e priorizando produtos onde TPU impresso em 3D tem vantagem real sobre plastico injetado barato.

## Criterio de decisao

Cada familia foi avaliada por:

- dor tecnica clara;
- concorrencia baixa ou mal resolvida;
- valor de customizacao;
- facilidade de briefing;
- facilidade de prototipagem;
- margem potencial;
- recompra ou manutencao recorrente;
- risco de falha em campo.

## Principio de produto

TPU deve entrar como:

- peca sob medida;
- capa de retrofit;
- face de contato substituivel;
- elemento anti-ruido/anti-vibracao;
- protecao para piso sensivel;
- solucao para geometria fora do padrao.

O produto lancado deve ser o modelo/familia parametrica, nao uma medida fixa. As medidas abaixo servem como presets de teste, exemplos comerciais e pontos de validacao no Grasshopper. Na venda, o cliente informa a medida funcional desejada e a peca e gerada dentro dos limites aprovados da familia.

TPU nao deve ser tratado inicialmente como:

- substituto barato de ponteira commodity;
- componente estrutural principal em carga alta;
- solucao final para escada ou item de seguranca sem teste;
- nivelador pesado com haste longa sem inserto metalico.

## Lista curta de familias para desenhar

### F1. Tubo Retangular Parametrico

Prioridade: alta

Por que desenhar:

- mercado cobre algumas medidas, mas deixa muitas lacunas;
- serralherias e fabricantes usam retangulares variados;
- erro de encaixe e comum;
- boa aplicacao para parametrizacao.

Parametros comerciais:

- largura externa nominal;
- altura externa nominal;
- largura interna real;
- altura interna real;
- espessura de parede;
- profundidade de insercao;
- altura de base;
- tipo de piso.

Presets de validacao:

- 30 x 20 mm;
- 40 x 20 mm;
- 50 x 30 mm;
- 20 x 30 mm;
- 20 x 40 mm;
- 25 x 50 mm;
- 30 x 60 mm.

Variantes:

- interna press-fit;
- externa/capa;
- base ampliada;
- base silenciosa;
- base com feltro/fibra.

Primeiro prototipo:

- modelo parametrico de ponteira interna retangular com aletas progressivas, validado inicialmente em 30 x 20 e 40 x 20.

### F2. Base Lisa / Chapa

Prioridade: alta

Por que desenhar:

- cobre banquinhos, poltronas, sofas, bases de chapa e pes lamina;
- o mercado comum resolve com adesivo, parafuso ou feltro generico;
- ha espaco para encaixe em U, oblongos e refis;
- boa familia para clientes de mobiliario autoral.

Parametros comerciais:

- forma da base: redonda, oblonga, retangular ou U;
- largura/comprimento da area de contato;
- espessura da chapa quando houver encaixe U;
- permissao de furo;
- tipo de adesivo ou parafuso;
- altura maxima aparente;
- tipo de piso.

Presets de validacao:

- redonda: 14, 20, 25, 30, 40, 50 mm;
- oblonga: 30 x 15, 40 x 20, 50 x 20, 60 x 25 mm;
- retangular: 35 x 25, 50 x 25, 75 x 25, 100 x 24 mm;
- encaixe em U: chapa 2, 3, 4, 5, 6 e 8 mm.

Variantes:

- adesiva com cavidade para fita;
- parafusada com tampa TPU;
- encaixe em U;
- antiderrapante;
- deslizante com PTFE;
- piso sensivel com feltro/fibra.

Primeiro prototipo:

- modelo parametrico de sapata oblonga com cavidade para fita e borda anti-cisalhamento, validado inicialmente em 50 x 20 mm;
- modelo parametrico de encaixe U, validado inicialmente para chapas de 3 mm e 5 mm.

### F3. Sled Base / Cantilever

Prioridade: alta

Por que desenhar:

- cadeiras base esqui e cantilever sao dificeis de resolver com sapata comum;
- alto desgaste em escolas, restaurantes e escritorios;
- boa oportunidade para snap-on e refil substituivel;
- reposicao sob medida tem valor.

Parametros comerciais:

- diametro ou largura do rail;
- comprimento de contato;
- raio/curvatura da base;
- snap-on simples ou com refil;
- largura do refil;
- tipo de contato com piso.

Presets de validacao:

- rail redondo 5/8";
- 3/4" a 7/8";
- 1" a 1.1/4";
- comprimento de contato 40, 48 e 60 mm.

Variantes:

- snap-on TPU;
- snap-on com feltro/fibra;
- face sacrificavel substituivel;
- cantilever heel-toe sob medida.

Primeiro prototipo:

- modelo parametrico de clip snap-on para rail redondo, validado inicialmente em 5/8" com base de 48 mm;
- versao com canal para refil.

### F4. Ponteira Anti-Arrancamento para Tubo Redondo/Quadrado

Prioridade: media-alta

Por que desenhar:

- ponteira comum existe, mas cai quando ha arrasto, empilhamento ou tolerancia ruim;
- TPU permite aletas flexiveis, trava reversivel e ajuste por medida interna real;
- boa entrada comercial para reposicao premium.

Parametros comerciais:

- perfil: redondo, quadrado ou oval;
- medida interna real;
- espessura de parede;
- profundidade de insercao;
- intensidade de trava;
- angulo do pe;
- tipo de base de contato.

Presets de validacao:

- redondo: 5/8", 3/4", 7/8", 1";
- quadrado: 20 x 20, 25 x 25, 30 x 30 mm.

Variantes:

- ajuste normal;
- ajuste forte;
- perna inclinada;
- base ampliada;
- base silenciosa.

Primeiro prototipo:

- modelo parametrico redondo com aletas progressivas, validado inicialmente em 7/8";
- modelo parametrico quadrado com trava anti-retorno, validado inicialmente em 25 x 25.

### F5. Piso Sensivel / Refil Substituivel

Prioridade: alta como modulo, nao como familia isolada

Por que desenhar:

- aparece em varias familias;
- cria recompra;
- resolve madeira, vinilico, porcelanato, epoxi e cimento polido;
- diferencia de ponteira plastica barata.

Formatos iniciais:

- redondo 28 e 34 mm;
- oblongo 50 x 20 mm;
- sled 48 x 12 mm;
- retangular 35 x 25 mm.

Materiais de contato:

- TPU puro;
- feltro/fibra;
- PTFE;
- borracha/TPU alto atrito.

Primeiro prototipo:

- modelo parametrico de base TPU com cavidade para refil adesivo;
- refil feltro/fibra trocavel em formatos derivados da familia principal.

### F6. Retrofit Escolar / Banquet / Hospitality

Prioridade: media

Por que desenhar:

- alto volume de manutencao;
- cadeiras escolares, restaurantes e buffets sofrem muito desgaste;
- oportunidade de capa sobre glide existente;
- requer mais levantamento de modelos reais antes de desenhar muito.

Produtos possiveis:

- wear cap sobre glide existente;
- cap 7/8" para cadeira dobravel;
- V-tip TPU;
- retentor anti-retorno;
- kit de manutencao com medidor.

Primeiro prototipo:

- modelo parametrico de cap externo para cadeira dobravel, validado inicialmente em 7/8";
- capa sobreposta parametrica para glide existente, validada inicialmente em base redonda 1.1/8".

### F7. Pes Anti-Vibracao para Equipamentos Leves

Prioridade: media

Por que desenhar:

- mercado e amplo, mas se distancia do foco moveleiro;
- bom para extensao futura;
- TPU tem valor real como isolador/capa.

Casos:

- caixa de som;
- impressora;
- equipamento de bancada;
- eletrodomestico pequeno;
- tripe/suporte removivel.

Primeiro prototipo:

- modelo parametrico de pe cilindrico parafusado com arruela/inserto;
- pad anti-vibracao parametrico com textura de alto atrito, validado inicialmente em 40 mm.

## Nao desenhar agora

| Familia | Motivo |
| --- | --- |
| Ponteira redonda preta padrao | Commodity muito barata |
| Ponteira quadrada 20/25/30 comum sem diferencial | Concorrencia direta com injetado |
| Nivelador pesado completo | Exige metal/rosca estrutural e teste de carga |
| Escada / item de seguranca | Requer teste e responsabilidade maior |
| Outdoor amplo | Depende de material e teste UV/intemperie |
| Pe higienico para saude como promessa sanitaria | TPU impresso cru nao deve prometer controle de infeccao |

## Ordem de prototipagem

### Sprint 1: modelos de encaixe

1. Modelo parametrico de tubo retangular interno.
2. Modelo parametrico de base lisa oblonga adesiva/parafusada.
3. Modelo parametrico de encaixe U para chapa.
4. Modelo parametrico de ponteira redonda anti-arrancamento.

Meta: validar logica parametrica, tolerancia, aletas, press-fit, adesivo protegido e acabamento. As medidas usadas no teste sao apenas presets.

### Sprint 2: contato com piso

1. Refil redondo parametrico.
2. Refil oblongo parametrico.
3. Base TPU + feltro/fibra.
4. Base TPU + PTFE.

Meta: comparar deslizar, travar, ruido, desgaste e sujeira.

### Sprint 3: institucional

1. Sled snap-on parametrico.
2. Sled snap-on com refil.
3. Cap externo parametrico para cadeira dobravel.
4. Wear cap parametrico para glide existente.

Meta: testar manutencao rapida, arrasto e resistencia a soltura.

## Matriz de parametros por familia

| Familia | Parametros obrigatorios | Fixacao principal | Risco principal |
| --- | --- | --- | --- |
| Tubo retangular | largura/altura interna, parede, profundidade | press-fit interno | nao encaixar por tolerancia |
| Base lisa/chapa | area de contato, espessura, material, permissao de furo | adesivo, parafuso ou U | descolar por cisalhamento |
| Sled/cantilever | diametro do rail, comprimento, raio/curva | snap-on/clip | sair ao arrastar |
| Anti-arrancamento | medida interna real, parede, angulo | press-fit com trava | dificil remover ou apertado demais |
| Piso sensivel | piso, carga, frequencia de arrasto | refil/cavidade | acumular sujeira ou desgastar rapido |
| Retrofit escolar | modelo existente, base atual, tubo | capa sobreposta | incompatibilidade com glide legado |
| Anti-vibracao | peso por pe, vibracao, temperatura | parafuso/adesivo/inserto | creep ou instabilidade |

## Briefing minimo antes de desenhar

Toda peca sob medida deve registrar:

- foto da base/pe/tubo;
- medida nominal;
- medida funcional real;
- espessura da parede ou chapa;
- area disponivel de contato;
- tipo de fixacao permitido;
- tipo de piso;
- carga aproximada por apoio;
- frequencia de arrasto;
- ambiente: interno, externo, umido, limpeza frequente;
- prioridade: deslizar, travar, nivelar, silenciar, amortecer ou proteger;
- quantidade inicial e potencial de recompra.

## Entregaveis CAD por produto

Cada produto desenhado deve gerar:

- arquivo parametrico da familia;
- STL por variante aprovada;
- ficha tecnica com medidas funcionais;
- instrucoes de medicao;
- instrucoes de instalacao;
- restricoes de uso;
- criterio de aceite dimensional;
- codigo SKU.

## Recomendacao final

Comecar por quatro modelos parametricos concretos:

1. `TB-RT-PI`: ponteira interna TPU para tubo retangular.
2. `TB-BL-OB`: sapata oblonga para base lisa/chapa.
3. `TB-CH-U`: sapata de encaixe U para chapa.
4. `TB-RD-AA`: ponteira redonda anti-arrancamento.

Esses quatro cobrem os principais aprendizados da pesquisa: geometria sob medida, base lisa, chapa sem tubo e fixacao superior. Cada um deve nascer como definicao Grasshopper com ranges aprovados e presets de validacao, nao como SKU preso a uma medida. Depois disso, evoluir para sled base e refil substituivel.
