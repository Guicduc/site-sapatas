// Conteudo editorial unico de cada pagina /familias/[slug], renderizado por
// components/family-guide.jsx antes das perguntas frequentes.
//
// Regras (ver docs/seo/keyword-research.md):
// - Toda afirmacao tecnica precisa bater com catalog/products/*.json (limites de medida, cores,
//   TPU, fixacao, prazo) e com /termos e /trocas. Tabelas de polegada e de metalon sao medidas
//   de mercado; o texto deixa claro que a peca e feita pela medida real informada.
// - Nada aqui entra em pedido, NF-e ou Mercado Pago: o nome operacional continua em
//   catalog/categories.json (`name`) e nos manifests (`name`).
//
// Paragrafos e itens de lista aceitam texto simples ou um array de trechos, em que cada
// trecho e uma string ou um link interno { href, label }.

const roundTubeRows = [
  ["1/2\"", "12,7", "cadeira de arame, estrutura leve"],
  ["5/8\"", "15,88", "cadeira tubular leve, banqueta"],
  ["3/4\"", "19,05", "cadeira de ferro, cadeira tubular, banqueta"],
  ["7/8\"", "22,23", "cadeira tubular e mesa"],
  ["1\"", "25,4", "cadeira, mesa, banqueta"],
  ["1 1/8\"", "28,58", "cadeira e mesa"],
  ["1 1/4\"", "31,75", "cadeira de área externa, mesa, banqueta"],
  ["1 1/2\"", "38,1", "mesa, bancada, estrutura"],
  ["2\"", "50,8", "mesa, estrutura, pé central"],
  ["2 1/2\"", "63,5", "pé central de mesa"],
  ["3\"", "76,2", "pé central de mesa, estrutura"]
];

export const roundTubeTable = {
  caption: "Tubo redondo: polegada para milímetro (diâmetro externo)",
  columns: ["Medida nominal", "Diâmetro externo (mm)", "Uso típico em móveis"],
  rows: roundTubeRows
};

export const metalonTable = {
  caption: "Metalon: medidas comerciais mais procuradas (externas, em mm)",
  columns: ["Perfil", "Medidas comuns"],
  rows: [
    ["Quadrado", "15x15, 20x20, 25x25, 30x30, 40x40, 50x50, 60x60, 70x70, 80x80, 100x100"],
    ["Retangular", "20x30, 20x40, 20x50, 30x40, 30x50, 30x60, 30x70, 30x90, 40x60, 40x80, 40x100, 50x100, 50x150"]
  ]
};

export const oblongSizes = [
  "16x30 mm, a medida mais comum em cadeiras",
  "17x30 mm",
  "20x47 mm",
  "29x58 mm",
  "17x50 mm e 30x60 mm",
  "16x40 mm e 18x40 mm, comuns em perfis de alumínio"
];

const screwCounterboreTable = {
  caption: "Diâmetro do parafuso e do escareamento",
  columns: ["Parafuso (mm)", "Escareamento (mm)"],
  rows: [
    ["3", "6"],
    ["4", "8"],
    ["5", "10"],
    ["6", "12"],
    ["8", "16"],
    ["10", "20"]
  ],
  note:
    "O escareamento sai com o dobro do diâmetro do parafuso escolhido. A cabeça do parafuso precisa caber nele."
};

const links = {
  tuboRedondo: { href: "/familias/sapata-tubo-redondo", label: "ponteira interna para tubo redondo" },
  metalon: { href: "/familias/sapata-tubo-quadrado", label: "ponteira interna para metalon" },
  oblongo: { href: "/familias/sapata-tubo-oblongo", label: "ponteira interna para tubo oblongo" },
  esferica: { href: "/familias/sapata-esferica", label: "sapata esférica (ponteira bola)" },
  sapataU: { href: "/familias/sapata-u", label: "sapata U para base trenó" },
  lisaRedonda: { href: "/familias/sapata-lisa-redonda", label: "sapata lisa redonda" },
  lisaQuadrada: { href: "/familias/sapata-lisa-quadrada", label: "sapata lisa quadrada" },
  parafusoRedonda: { href: "/familias/sapata-com-parafuso-redonda", label: "sapata redonda com parafuso" },
  parafusoQuadrada: { href: "/familias/sapata-com-parafuso-quadrada", label: "sapata quadrada com parafuso" },
  projetoEspecial: { href: "/projeto-especial", label: "projeto especial" }
};

const wallMattersSection = {
  id: "parede",
  title: "Por que a parede do tubo importa",
  paragraphs: [
    "Dois tubos com a mesma medida externa podem ter paredes diferentes, de menos de 1 mm a 2 mm ou mais. A ponteira vendida pronta é feita para uma parede padrão: em tubo de parede fina ela fica folgada e cai; em parede grossa ou com rebarba de solda, ela não entra.",
    "Aqui a parede faz parte da medida. Você informa a espessura (de 0,8 a 8 mm) e a parte que entra no tubo sai do tamanho do vão interno real. O configurador exige pelo menos 5 mm de vão depois de descontar a parede dos dois lados."
  ]
};

export const familyGuides = {
  "sapata-tubo-redondo": {
    title: "Guia da ponteira para tubo redondo",
    intro: [
      "A ponteira interna (também chamada de sapata ou tampa para tubo) fecha a ponta do pé tubular e fica entre o metal e o piso. Esta é a versão para tubo redondo: ela entra no tubo por pressão e é feita para o diâmetro externo e a parede do seu tubo, não para uma medida nominal de prateleira."
    ],
    sections: [
      {
        id: "onde-usar",
        title: "Onde usar",
        paragraphs: [
          "Pé de cadeira de ferro e de cadeira tubular, mesa de tubo redondo, banqueta, rack e estante com estrutura tubular. Também resolve a reposição da ponteira que soltou, rachou ou gastou e não se acha mais na loja, inclusive em cadeiras antigas cujo tubo não bate com as medidas comuns."
        ]
      },
      {
        id: "como-medir",
        title: "Como medir o tubo redondo",
        ordered: true,
        list: [
          "Retire a ponteira velha, se houver. Medir a ponteira antiga não diz nada sobre o tubo.",
          "Meça o diâmetro externo com paquímetro, na ponta do tubo, em duas direções. Se der diferente, use a média.",
          "Meça a espessura da parede na borda aberta do tubo.",
          "Informe as duas medidas no configurador e escolha a altura da base (de 1 a 10 mm) e da parte que entra no tubo (de 5 a 35 mm)."
        ]
      },
      {
        id: "medidas",
        title: "Medidas comuns de tubo redondo",
        paragraphs: [
          "Quem procura ponteira 7/8 ou ponteira 3/4 está falando da medida nominal do tubo em polegadas. A tabela converte para milímetros."
        ],
        table: {
          ...roundTubeTable,
          note: "A ponteira é feita pela medida real que você informa, até 150 mm de diâmetro externo. A tabela serve para identificar o tubo; o seu pode variar alguns décimos."
        }
      },
      wallMattersSection
    ]
  },

  "sapata-tubo-quadrado": {
    title: "Guia da ponteira para metalon",
    intro: [
      "A ponteira interna para metalon (também chamada de sapata ou tampa para metalon) fecha a ponta do tubo quadrado ou retangular e protege o piso. Ela entra no tubo por pressão e é feita pelas medidas externas e pela parede do seu perfil, até 150x150 mm, inclusive medidas retangulares como 50x30 ou 100x50."
    ],
    sections: [
      {
        id: "onde-usar",
        title: "Onde usar",
        paragraphs: [
          "Pé de mesa e de bancada de metalon, banqueta, aparador, rack, estante de estilo industrial e estruturas de serralheria. Em perfis grandes ou pouco comuns, como 100x50 ou 150x50, a oferta pronta é pequena e a peça sob encomenda costuma ser a saída."
        ]
      },
      {
        id: "como-medir",
        title: "Como medir o metalon",
        ordered: true,
        list: [
          "Meça a largura e a altura externas com paquímetro. No retangular, anote as duas, por exemplo 50x30.",
          "Meça a espessura da parede na borda aberta.",
          "Se houver rebarba de corte ou de solda na boca do tubo, lixe antes de medir e de encaixar.",
          "Informe largura, altura e parede no configurador. Ele calcula o vão interno e confere se sobram pelo menos 5 mm."
        ]
      },
      {
        id: "medidas",
        title: "Medidas comuns de metalon",
        paragraphs: [
          "As medidas abaixo são as mais procuradas para ponteira de metalon. Todas ficam dentro do limite de 150 mm por lado do configurador."
        ],
        table: {
          ...metalonTable,
          note: "A ponteira é feita pelas medidas reais que você informa, não pela medida comercial. Confira o seu tubo com paquímetro."
        }
      },
      {
        id: "chapa",
        title: "Chapa 18, chapa 20 e a parede do tubo",
        paragraphs: [
          "A chapa indica a espessura da parede: quanto maior o número, mais fina a parede. Uma ponteira 20x20 feita para chapa 18 fica folgada em chapa 20, e a feita para chapa 20 pode não entrar em chapa 16. Por isso o configurador pede a parede, de 0,8 a 8 mm."
        ]
      }
    ]
  },

  "sapata-tubo-oblongo": {
    title: "Guia da ponteira para tubo oblongo",
    intro: [
      "A ponteira interna para tubo oblongo (oval) fecha perfis achatados, com as laterais arredondadas, comuns em cadeiras e mesas. É a ponteira mais difícil de achar pronta: os fabricantes oferecem poucas medidas, quase sempre 16x30. Aqui ela é feita pela largura, pela altura e pela parede do seu perfil."
    ],
    sections: [
      {
        id: "oblongo-ou-retangular",
        title: "Oblongo, oval ou retangular?",
        paragraphs: [
          "No comércio, oblongo e oval costumam ser o mesmo pedido: um perfil achatado sem cantos. Esta ponteira atende os dois. Se o tubo tiver lados retos e cantos definidos, ele é retangular: use a ponteira para metalon.",
          ["Para tubo retangular, veja a ", links.metalon, "."]
        ]
      },
      {
        id: "como-medir",
        title: "Como medir o tubo oblongo",
        ordered: true,
        list: [
          "Largura externa: a maior medida do perfil, de uma ponta à outra.",
          "Altura externa: a menor medida, de um lado achatado ao outro.",
          "Parede: a espessura na borda aberta do tubo.",
          "Informe as três medidas no configurador. Ele confere se sobram pelo menos 5 mm de vão interno nos dois sentidos."
        ]
      },
      {
        id: "medidas",
        title: "Medidas de mercado de tubo oblongo",
        list: oblongSizes,
        paragraphs: [
          "Cadeiras importadas e linhas antigas usam medidas fora dessa lista. A ponteira é feita pela medida que você informar, até 150 mm em cada sentido."
        ]
      },
      wallMattersSection
    ]
  },

  "sapata-lisa-redonda": {
    title: "Guia da sapata lisa redonda",
    intro: [
      "A sapata lisa redonda é um apoio plano que fica embaixo do pé do móvel e evita o contato direto com o piso. Serve para pés redondos de madeira ou de metal e para bases circulares. Pode ter um pino de encaixe (haste) para pés que têm um furo no centro."
    ],
    sections: [
      {
        id: "onde-usar",
        title: "Onde usar",
        paragraphs: [
          "Pé de sofá e de poltrona, mesa de pé redondo, banqueta, rack, cama e bases circulares de metal.",
          ["Se o pé for um tubo de metal com a ponta aberta, prefira a ", links.tuboRedondo, ", que fica presa dentro do tubo."]
        ]
      },
      {
        id: "pino",
        title: "Com ou sem pino de encaixe",
        paragraphs: [
          "Sem pino, a sapata é uma base plana para ser colada sob o pé. Com pino, ela ganha uma haste central de 3 a 15 mm de diâmetro e 5 a 35 mm de altura, que entra num furo do pé e ajuda a manter a sapata no lugar."
        ]
      },
      {
        id: "como-medir",
        title: "Como escolher a medida",
        list: [
          "Meça o diâmetro da face do pé que toca o piso. A sapata vai de 3 a 150 mm.",
          "Escolha a altura da base, de 1 a 10 mm.",
          "Se for usar o pino, meça o diâmetro e a profundidade do furo do pé: a haste precisa caber nele.",
          "A sapata tem altura fixa e não nivela o móvel. Para regular altura em piso irregular, o indicado é um pé nivelador com rosca, que não faz parte do catálogo."
        ]
      }
    ]
  },

  "sapata-lisa-quadrada": {
    title: "Guia da sapata lisa quadrada",
    intro: [
      "A sapata lisa quadrada é um apoio plano para pés de seção quadrada ou retangular. Fica embaixo do pé, evita o contato direto com o piso e pode ter um pino de encaixe (haste) para pés que têm um furo no centro."
    ],
    sections: [
      {
        id: "onde-usar",
        title: "Onde usar",
        paragraphs: [
          "Pé de mesa quadrado ou retangular, banqueta, estante, rack, bases de chapa metálica e pés de madeira de seção quadrada.",
          ["Se o pé for um tubo de metalon com a ponta aberta, prefira a ", links.metalon, ", que fica presa dentro do tubo."]
        ]
      },
      {
        id: "pino",
        title: "Com ou sem pino de encaixe",
        paragraphs: [
          "Sem pino, a sapata é uma base plana para ser colada sob o pé. Com pino, ela ganha uma haste central de 3 a 15 mm de diâmetro e 5 a 35 mm de altura, que entra num furo do pé e ajuda a manter a sapata no lugar."
        ]
      },
      {
        id: "como-medir",
        title: "Como escolher a medida",
        list: [
          "Meça os dois lados da face do pé que toca o piso. Cada lado vai de 3 a 150 mm, então a sapata pode ser quadrada ou retangular.",
          "Escolha a altura da base, de 1 a 10 mm.",
          "Se for usar o pino, meça o diâmetro e a profundidade do furo do pé: a haste precisa caber nele.",
          "A sapata tem altura fixa e não nivela o móvel. Para regular altura em piso irregular, o indicado é um pé nivelador com rosca, que não faz parte do catálogo."
        ]
      }
    ]
  },

  "sapata-com-parafuso-redonda": {
    title: "Guia da sapata redonda com parafuso",
    intro: [
      "A sapata com parafuso é presa ao pé por um parafuso que atravessa o centro da peça. O furo tem escareamento na face de baixo, com o dobro do diâmetro do parafuso, para a cabeça ficar embutida e não tocar o piso. A fixação fica mais firme do que a de uma sapata apenas colada."
    ],
    sections: [
      {
        id: "onde-usar",
        title: "Onde usar",
        paragraphs: [
          "Pés redondos de madeira de cadeira, mesa, banco e poltrona, e pés de metal que aceitem parafuso no centro da face de apoio.",
          ["Para pé de tubo com a ponta aberta, use a ", links.tuboRedondo, "."]
        ]
      },
      {
        id: "parafuso",
        title: "Como escolher o parafuso",
        paragraphs: [
          "Você escolhe o diâmetro do parafuso no configurador, de 2 a 10 mm. O parafuso não acompanha a sapata: use um modelo adequado ao material e à profundidade do pé, com a cabeça cabendo no escareamento."
        ],
        table: screwCounterboreTable
      },
      {
        id: "como-medir",
        title: "Como escolher a medida",
        list: [
          "Meça o diâmetro da face do pé que toca o piso. A sapata vai de 12 a 150 mm.",
          "Escolha a altura da base, de 1 a 10 mm.",
          "Em diâmetros pequenos, o configurador confere se sobra material suficiente em volta do escareamento."
        ]
      }
    ]
  },

  "sapata-com-parafuso-quadrada": {
    title: "Guia da sapata quadrada com parafuso",
    intro: [
      "A sapata quadrada com parafuso é presa ao pé por um parafuso que atravessa o centro da peça. O furo tem escareamento na face de baixo, com o dobro do diâmetro do parafuso, para a cabeça ficar embutida e não tocar o piso. Os dois lados são configurados separadamente, então ela também pode ser retangular."
    ],
    sections: [
      {
        id: "onde-usar",
        title: "Onde usar",
        paragraphs: [
          "Pés de madeira de seção quadrada ou retangular em mesas, cadeiras, bancos e poltronas, e pés de metal que aceitem parafuso no centro da face de apoio.",
          ["Para pé de metalon com a ponta aberta, use a ", links.metalon, "."]
        ]
      },
      {
        id: "parafuso",
        title: "Como escolher o parafuso",
        paragraphs: [
          "Você escolhe o diâmetro do parafuso no configurador, de 2 a 10 mm. O parafuso não acompanha a sapata: use um modelo adequado ao material e à profundidade do pé, com a cabeça cabendo no escareamento."
        ],
        table: screwCounterboreTable
      },
      {
        id: "como-medir",
        title: "Como escolher a medida",
        list: [
          "Meça os dois lados da face do pé que toca o piso. Cada lado vai de 12 a 150 mm.",
          "Escolha a altura da base, de 1 a 10 mm.",
          "Em medidas pequenas, o configurador confere se sobra material suficiente em volta do escareamento."
        ]
      }
    ]
  },

  "sapata-esferica": {
    title: "Guia da ponteira bola",
    intro: [
      "A sapata esférica, conhecida no mercado como ponteira bola, termina o pé tubular com uma esfera. A parte de encaixe entra no tubo redondo por pressão e a esfera é dimensionada pelo diâmetro externo do tubo."
    ],
    sections: [
      {
        id: "quando-usar",
        title: "Quando escolher a ponteira bola",
        paragraphs: [
          "O apoio arredondado toca o piso do mesmo jeito mesmo quando o pé chega inclinado ao chão, o que ajuda em cadeiras e mesas com pés abertos. Ela também é escolhida pelo acabamento e para repor ponteiras bola originais.",
          ["Para pé de tubo vertical com acabamento reto, veja a ", links.tuboRedondo, "."]
        ]
      },
      {
        id: "como-medir",
        title: "Como medir",
        ordered: true,
        list: [
          "Meça o diâmetro externo do tubo com paquímetro. A peça atende de 20 a 75 mm.",
          "Meça a espessura da parede na borda aberta, de 0,8 a 6 mm.",
          "Escolha a altura de encaixe, de 17 a 35 mm."
        ]
      },
      {
        id: "medidas",
        title: "Medidas de tubo atendidas",
        table: {
          caption: "Tubos redondos dentro da faixa da ponteira bola (20 a 75 mm)",
          columns: ["Medida nominal", "Diâmetro externo (mm)", "Uso típico em móveis"],
          rows: roundTubeRows.filter(([, mm]) => {
            const value = Number(mm.replace(",", "."));
            return value >= 20 && value <= 75;
          })
        },
        paragraphs: [
          "Tubo de 3/4\" (19,05 mm) fica abaixo do mínimo de 20 mm e tubo de 3\" (76,2 mm) passa do máximo de 75 mm. Para eles, use a ponteira interna para tubo redondo, que vai até 150 mm."
        ]
      }
    ]
  },

  "sapata-u": {
    title: "Guia da sapata U para base trenó",
    intro: [
      "Esta sapata U é para tubo redondo, e não para chapa de MDF. A peça vendida como \"sapata U para MDF\" é outro produto, que encaixa na borda de chapas de madeira. A sapata U da Baseforma é uma meia-cana que abraça o tubo horizontal da base trenó, no trecho em que ele encosta no piso."
    ],
    sections: [
      {
        id: "base-treno",
        title: "O que é base trenó",
        paragraphs: [
          "Na base trenó, os pés da cadeira são formados por um tubo contínuo que desce e corre paralelo ao piso, como os patins de um trenó. Como o tubo toca o chão pela lateral, não existe ponta aberta para uma ponteira interna: a proteção precisa abraçar o tubo por fora. É isso que a sapata U faz, encaixando por pressão."
        ]
      },
      {
        id: "como-medir",
        title: "Como medir",
        list: [
          "Diâmetro externo do tubo, medido com paquímetro no trecho que encosta no piso: de 5 a 60 mm.",
          "Comprimento da sapata, ou seja, quanto do tubo ela cobre: de 5 a 100 mm.",
          "Espessura da sapata, de 0,5 a 3 mm: quanto maior, mais material entre o tubo e o piso.",
          "Com ou sem haste: a versão com haste tem um pino central dentro do U."
        ]
      },
      {
        id: "medidas",
        title: "Tubos comuns em base trenó",
        table: {
          caption: "Tubo redondo: polegada para milímetro (diâmetro externo)",
          columns: ["Medida nominal", "Diâmetro externo (mm)", "Uso típico em móveis"],
          rows: roundTubeRows.filter(([, mm]) => Number(mm.replace(",", ".")) <= 25.4)
        },
        paragraphs: [
          "A tabela é só referência. A sapata é feita pelo diâmetro real que você informa, de 5 a 60 mm."
        ]
      }
    ]
  }
};

// Texto publico das familias geradas a partir do manifesto em lib/site-data.js
// (familyFromManifest). As familias editoriais tem o texto direto em site-data.js.
export const manifestFamilyCopy = {
  "sapata-esferica": {
    name: "Sapata esférica (ponteira bola)",
    eyebrow: "Ponteira bola para tubo redondo",
    seoTitle: "Ponteira bola para tubo redondo sob medida",
    seoDescription:
      "Sapata esférica (ponteira bola) para cadeira e mesa tubular. Encaixe interno por pressão em tubo de 20 a 75 mm, ajustado à parede. TPU em 4 cores.",
    keyword: "ponteira bola",
    productCategory: "Ponteira para tubo",
    tagline:
      "Ponteira bola que entra no tubo redondo por pressão, feita pelo diâmetro externo e pela parede do tubo.",
    heroTitle: "Sapata esférica (ponteira bola) para tubo redondo",
    heroDescription:
      "A sapata esférica, conhecida como ponteira bola, termina o pé tubular com uma esfera dimensionada pelo diâmetro externo do tubo. Encaixe interno por pressão, para tubos de 20 a 75 mm, em TPU preto, branco, cinza ou marrom.",
    fixation: "encaixe interno por pressão",
    compatibilitySummary: "Diâmetro externo do tubo de 20 a 75 mm; parede de 0,8 a 6 mm.",
    parameterSummary: ["tubo redondo", "diâmetro de 20 a 75 mm", "parede de 0,8 a 6 mm"],
    highlights: ["tubo de 20 a 75 mm", "sem pedido mínimo", "4 cores"],
    fitTitle: "Onde usar",
    fitDescription:
      "Cadeiras e mesas tubulares, estruturas metálicas e reposição de ponteiras bola.",
    asideTitle: "Configure pela medida do seu tubo",
    asideDescription: "Informe o diâmetro externo e a parede do tubo e veja preço e prazo na hora.",
    faqs: [
      {
        question: "Para que serve a ponteira bola?",
        answer:
          "Ela fecha a ponta do tubo com uma esfera. O apoio arredondado toca o piso do mesmo jeito mesmo quando o pé é inclinado e dá outro acabamento a cadeiras e mesas."
      },
      {
        question: "Qual medida de tubo a ponteira bola atende?",
        answer:
          "Tubos redondos de 20 a 75 mm de diâmetro externo, com parede de 0,8 a 6 mm. Um tubo de 3/4\" (19,05 mm) fica abaixo do mínimo; para ele, use a ponteira interna para tubo redondo."
      },
      {
        question: "Como medir o tubo?",
        answer:
          "Com paquímetro, meça o diâmetro externo e a espessura da parede na ponta aberta do tubo. A altura de encaixe pode ir de 17 a 35 mm."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer: "Preto, branco, cinza e marrom, sem quantidade mínima."
      }
    ]
  },
  "sapata-u": {
    name: "Sapata U para base trenó",
    eyebrow: "Sapata meia-cana para tubo redondo",
    seoTitle: "Sapata U para cadeira base trenó sob medida",
    seoDescription:
      "Sapata em U (meia-cana) que encaixa por pressão no tubo horizontal de cadeiras base trenó. Tubo de 5 a 60 mm, com ou sem haste. Protege o piso.",
    keyword: "sapata para cadeira base trenó",
    productCategory: "Sapata para móveis",
    tagline:
      "Sapata meia-cana que abraça o tubo redondo apoiado no piso, feita pelo diâmetro do tubo.",
    heroTitle: "Sapata U para cadeira base trenó",
    heroDescription:
      "Para o tubo redondo de cadeiras com base trenó, e não para chapa de MDF. A sapata em U (meia-cana) abraça o tubo horizontal que encosta no piso e encaixa por pressão. Tubo de 5 a 60 mm de diâmetro externo, com ou sem haste.",
    fixation: "encaixe por pressão",
    compatibilitySummary: "Tubo redondo de 5 a 60 mm; comprimento da sapata de 5 a 100 mm.",
    parameterSummary: ["tubo redondo", "diâmetro de 5 a 60 mm", "comprimento de 5 a 100 mm"],
    highlights: ["tubo de 5 a 60 mm", "com ou sem haste", "sem pedido mínimo"],
    fitTitle: "Onde usar",
    fitDescription:
      "Cadeiras e banquetas com base trenó, em que um tubo redondo horizontal apoia no piso, e outras estruturas tubulares que tocam o chão pela lateral do tubo.",
    asideTitle: "Configure pelo diâmetro do tubo",
    asideDescription:
      "Informe o diâmetro externo do tubo, o comprimento e a espessura da sapata e veja preço e prazo na hora.",
    faqs: [
      {
        question: "A sapata U serve para chapa de MDF?",
        answer:
          "Não. Esta sapata U é para tubo redondo. A peça vendida como sapata U para MDF é outro produto, que encaixa na borda de chapas de madeira."
      },
      {
        question: "Como saber o diâmetro do tubo da base trenó?",
        answer:
          "Meça o diâmetro externo com paquímetro no trecho do tubo que encosta no piso. A sapata atende tubos de 5 a 60 mm."
      },
      {
        question: "Quantas sapatas usar por cadeira?",
        answer:
          "Em geral, uma perto de cada ponta de cada trilho que toca o piso: numa base trenó com dois trilhos, quatro sapatas. Confira os pontos em que o tubo realmente encosta no chão."
      },
      {
        question: "Com haste ou sem haste: qual escolher?",
        answer:
          "A versão com haste tem um pino central dentro do U, pensado para tubos com um furo na face de baixo que recebe o pino. Se o seu tubo não tem esse furo, escolha a versão sem haste."
      },
      {
        question: "Quais cores estão disponíveis?",
        answer: "Preto, branco, cinza e marrom, sem quantidade mínima."
      }
    ]
  }
};

export function getFamilyGuide(slug) {
  return familyGuides[slug] || null;
}
