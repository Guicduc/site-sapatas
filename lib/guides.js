// Guias publicados em /guias/[slug]. Fonte dos temas e termos: docs/seo/keyword-research.md,
// secoes (f) e (g). `title` vai sem a marca (ate 49 caracteres); `description` ate 155.
// test/seo-content.test.js valida limites, campos obrigatorios e presenca no sitemap.
//
// Paragrafos e itens de lista aceitam texto simples ou um array de trechos, em que cada
// trecho e uma string ou um link interno { href, label }. Toda afirmacao sobre o produto
// precisa bater com catalog/products/*.json, /termos e /trocas.

import {
  metalonTable,
  oblongSizes,
  roundTubeTable,
  wallGaugeTable
} from "./family-content.js";

const links = {
  configuradorTubo: { href: "/configurar/ponteira-interna-tubo", label: "configurador da ponteira interna para tubo" },
  tuboRedondo: { href: "/familias/sapata-tubo-redondo", label: "ponteira interna para tubo redondo" },
  metalon: { href: "/familias/sapata-tubo-quadrado", label: "ponteira interna para metalon" },
  oblongo: { href: "/familias/sapata-tubo-oblongo", label: "ponteira interna para tubo oblongo" },
  esferica: { href: "/familias/sapata-esferica", label: "sapata esférica (ponteira bola)" },
  sapataU: { href: "/familias/sapata-u", label: "sapata U para base trenó" },
  lisaRedonda: { href: "/familias/sapata-lisa-redonda", label: "sapata lisa redonda" },
  lisaQuadrada: { href: "/familias/sapata-lisa-quadrada", label: "sapata lisa quadrada" },
  parafusoRedonda: { href: "/familias/sapata-com-parafuso-redonda", label: "sapata redonda com parafuso" },
  parafusoQuadrada: { href: "/familias/sapata-com-parafuso-quadrada", label: "sapata quadrada com parafuso" },
  projetoEspecial: { href: "/projeto-especial", label: "projeto especial" },
  guiaMedir: { href: "/guias/como-medir-tubo-para-ponteira", label: "como medir o tubo para ponteira" },
  guiaTabela: { href: "/guias/tabela-medidas-tubo-metalon", label: "tabela de medidas de tubo e metalon" },
  guiaInternaExterna: { href: "/guias/ponteira-interna-ou-externa", label: "ponteira interna ou externa" }
};

const publishedAt = "2026-11-17";

export const guides = [
  {
    slug: "como-medir-tubo-para-ponteira",
    title: "Como medir tubo e metalon para ponteira interna",
    description:
      "Passo a passo para medir pé de cadeira e mesa: diâmetro externo, lados do metalon, tubo oblongo e espessura da parede, com e sem paquímetro.",
    heading: "Como medir o tubo para comprar a ponteira certa",
    lead:
      "A ponteira interna só encaixa bem quando é feita para a medida real do tubo. Para isso você precisa de duas informações: a medida externa e a espessura da parede. Veja como obter as duas em tubo redondo, metalon e tubo oblongo.",
    datePublished: publishedAt,
    dateModified: publishedAt,
    sections: [
      {
        id: "o-que-medir",
        title: "O que medir",
        paragraphs: [
          "Três números definem o encaixe: a medida externa do tubo (o diâmetro no tubo redondo; largura e altura no metalon e no oblongo), a espessura da parede e, a partir delas, o vão interno, que é a medida externa menos duas vezes a parede. O configurador da Baseforma pede as duas primeiras e calcula o vão sozinho.",
          "A medida nominal do tubo, como 7/8\", 20x20 ou 16x30, é só um ponto de partida: o mesmo nominal pode ter paredes diferentes, e é a parede que decide se a ponteira fica firme ou folgada."
        ]
      },
      {
        id: "com-paquimetro",
        title: "Com paquímetro (recomendado)",
        ordered: true,
        list: [
          "Retire a ponteira velha, se houver, e limpe a boca do tubo. Medir a ponteira antiga não serve: ela pode estar gasta ou ter sido feita para outra parede.",
          "Use as orelhas externas do paquímetro para medir o diâmetro externo, ou a largura e a altura no metalon, logo na ponta do tubo.",
          "Meça de novo em outra direção. No tubo redondo, diferenças de alguns décimos são normais; use a média.",
          "Meça a parede apoiando as pontas do paquímetro dentro e fora da borda. Se houver rebarba, lixe antes.",
          "Se quiser conferir, meça o diâmetro interno com as orelhas internas do paquímetro: ele deve bater com a medida externa menos duas vezes a parede."
        ]
      },
      {
        id: "sem-paquimetro",
        title: "Sem paquímetro",
        paragraphs: [
          "Com régua ou trena você consegue a medida externa com precisão de cerca de 1 mm. Isso ajuda a identificar o tubo na tabela, mas não basta para a parede, que costuma ter entre 0,9 e 2 mm.",
          "Para o diâmetro do tubo redondo, enrole uma tira de papel em volta do tubo, marque onde ela se encontra, meça o comprimento e divida por 3,14. Para a parede, compare com a tabela de chapas ou pergunte a quem fabricou o móvel. Um paquímetro simples custa pouco e evita uma ponteira folgada.",
          ["Use a ", links.guiaTabela, " para converter polegada em milímetro e chapa em espessura."]
        ]
      },
      {
        id: "por-formato",
        title: "Tubo redondo, metalon e tubo oblongo",
        list: [
          ["Tubo redondo: informe o diâmetro externo e a parede. Veja a ", links.tuboRedondo, "."],
          ["Metalon, quadrado ou retangular: informe largura, altura e parede. Veja a ", links.metalon, "."],
          ["Tubo oblongo ou oval: a largura é a maior medida e a altura, a menor. Veja a ", links.oblongo, "."],
          ["Tubo redondo que apoia no piso pela lateral, como na base trenó: meça o diâmetro externo e veja a ", links.sapataU, "."]
        ]
      },
      {
        id: "erros-comuns",
        title: "Erros comuns",
        list: [
          "Medir a ponteira velha em vez do tubo.",
          "Usar a medida nominal em polegada como se fosse a medida real: 7/8\" tem cerca de 22,2 mm por fora, e o vão interno depende da parede.",
          "Esquecer a parede: com a mesma medida externa, paredes de 0,9 mm e de 2 mm pedem ponteiras diferentes.",
          "Medir um pé só: em móveis antigos ou soldados à mão, os pés podem variar entre si.",
          "Trocar os lados no metalon retangular: anote largura x altura do mesmo tubo."
        ]
      },
      {
        id: "depois-de-medir",
        title: "Depois de medir",
        paragraphs: [
          ["Com as medidas em mãos, abra o ", links.configuradorTubo, ", escolha o formato e informe os valores. Preço e prazo aparecem na hora, sem pedido mínimo."],
          ["Se o tubo não for redondo, quadrado, retangular ou oblongo, ou se a medida passar de 150 mm, descreva o caso em um ", links.projetoEspecial, "."]
        ]
      }
    ],
    cta: [
      { href: "/configurar/ponteira-interna-tubo", label: "Configurar ponteira para tubo", primary: true },
      { href: "/guias/tabela-medidas-tubo-metalon", label: "Ver tabela de medidas" }
    ]
  },
  {
    slug: "tabela-medidas-tubo-metalon",
    title: "Tabela de medidas de tubo e metalon em mm",
    description:
      "Tubo 7/8, 3/4 e 1 polegada em mm, medidas comuns de metalon quadrado e retangular, tubo oblongo e espessura por chapa. Referência para escolher a ponteira.",
    heading: "Tabela de medidas de tubo redondo, metalon e oblongo",
    lead:
      "Referência rápida para converter polegada em milímetro, conhecer as medidas comerciais de metalon e de tubo oblongo e entender a espessura por chapa. A Baseforma fabrica pela medida real que você informa, dentro dos limites do configurador: use a tabela para identificar o tubo e confira sempre com paquímetro.",
    datePublished: publishedAt,
    dateModified: publishedAt,
    sections: [
      {
        id: "tubo-redondo",
        title: "Tubo redondo: polegada para mm",
        paragraphs: [
          "Tubo 7/8 tem 22,23 mm de diâmetro externo, tubo 3/4 tem 19,05 mm e tubo de 1 polegada tem 25,4 mm. A conversão é sempre a medida em polegadas vezes 25,4."
        ],
        table: {
          ...roundTubeTable,
          note: "Diâmetro externo nominal. Tubos reais podem variar alguns décimos de milímetro."
        }
      },
      {
        id: "metalon",
        title: "Metalon quadrado e retangular",
        paragraphs: [
          "Metalon é o nome comercial do tubo de aço de seção quadrada ou retangular. A medida é sempre a externa, em milímetros: 20x20, 30x30, 50x30 e assim por diante."
        ],
        table: {
          ...metalonTable,
          note: "Todas essas medidas ficam dentro do limite de 150 mm por lado do configurador."
        }
      },
      {
        id: "tubo-oblongo",
        title: "Tubo oblongo",
        paragraphs: [
          "O tubo oblongo, também chamado de oval, é achatado e sem cantos. A medida é largura x altura externas."
        ],
        list: oblongSizes
      },
      {
        id: "chapa",
        title: "Chapa e espessura da parede",
        paragraphs: [
          "A chapa indica a espessura da parede do tubo: quanto maior o número, mais fina a parede. Chapa 18 tem cerca de 1,20 mm e chapa 20, cerca de 0,90 mm. Os valores variam entre fabricantes; meça a parede do seu tubo quando puder."
        ],
        table: wallGaugeTable
      },
      {
        id: "qual-ponteira",
        title: "Qual peça para cada medida",
        list: [
          ["Tubo redondo de ponta aberta, até 150 mm: ", links.tuboRedondo, "."],
          ["Tubo redondo de 20 a 75 mm com acabamento em esfera: ", links.esferica, "."],
          ["Metalon quadrado ou retangular, até 150 mm por lado: ", links.metalon, "."],
          ["Tubo oblongo ou oval, até 150 mm em cada sentido: ", links.oblongo, "."],
          ["Tubo redondo de 5 a 60 mm apoiado no piso pela lateral: ", links.sapataU, "."]
        ]
      }
    ],
    cta: [
      { href: "/configurar/ponteira-interna-tubo", label: "Configurar ponteira para tubo", primary: true },
      { href: "/guias/como-medir-tubo-para-ponteira", label: "Como medir o tubo" }
    ]
  },
  {
    slug: "ponteira-interna-ou-externa",
    title: "Ponteira interna ou externa: qual usar no tubo",
    description:
      "Diferença entre ponteira interna e externa para tubo e metalon, quando usar cada uma e por que a parede do tubo decide o encaixe da ponteira interna.",
    heading: "Ponteira interna ou externa: diferenças e quando usar cada uma",
    lead:
      "As duas fecham a ponta do tubo e protegem o piso, mas encaixam de jeitos diferentes. Entender a diferença evita comprar a peça errada.",
    datePublished: publishedAt,
    dateModified: publishedAt,
    sections: [
      {
        id: "diferenca",
        title: "A diferença",
        paragraphs: [
          "A ponteira interna tem uma parte que entra no tubo e uma base que fica para fora, apoiada no piso. A ponteira externa é uma capa que veste a ponta do tubo por fora.",
          "No comércio, ponteira e sapata são usados para as duas; tampa costuma indicar a interna."
        ]
      },
      {
        id: "quando-interna",
        title: "Quando usar a ponteira interna",
        list: [
          "Tubo com a ponta aberta e sem amassados: redondo, quadrado, retangular ou oblongo.",
          "Quando você não quer aumentar a medida externa do pé.",
          "Quando o acabamento importa: a base cobre a borda cortada do tubo.",
          "Na reposição de ponteiras internas que soltaram ou quebraram."
        ]
      },
      {
        id: "quando-externa",
        title: "Quando a externa faz mais sentido",
        list: [
          "Tubo com a ponta amassada, ovalizada ou fechada por solda, em que nada consegue entrar.",
          "Pé maciço, sem vão interno.",
          "Tubo com vão interno muito pequeno, abaixo de 5 mm depois de descontar a parede."
        ]
      },
      {
        id: "acabamento",
        title: "Acabamento e segurança",
        paragraphs: [
          "A borda de um tubo cortado pode ser viva e riscar o piso. A ponteira interna cobre essa borda com a base e mantém o metal afastado do chão. Por isso vale trocá-la assim que gastar, rachar ou soltar."
        ]
      },
      {
        id: "baseforma",
        title: "Por que a Baseforma faz ponteira interna",
        paragraphs: [
          "O problema mais comum da ponteira interna pronta é o encaixe: ela é feita para uma parede padrão e fica solta ou não entra. Fabricando sob encomenda, a Baseforma dimensiona a parte que entra no tubo pelo vão interno real, calculado a partir da medida externa e da parede que você informa.",
          ["Ponteira externa não faz parte do catálogo. Para casos fora do padrão, descreva a peça em um ", links.projetoEspecial, "."],
          ["Antes de comprar, veja ", links.guiaMedir, "."]
        ]
      }
    ],
    cta: [
      { href: "/configurar/ponteira-interna-tubo", label: "Configurar ponteira interna", primary: true },
      { href: "/guias/como-medir-tubo-para-ponteira", label: "Como medir o tubo" }
    ]
  },
  {
    slug: "cadeira-riscando-o-piso",
    title: "Cadeira riscando o piso: como proteger o chão",
    description:
      "Por que a cadeira risca o piso e como proteger: ponteira interna, capa de silicone, feltro e deslizador. Prós, contras e quando trocar a ponteira.",
    heading: "Cadeira riscando o piso: causas e como resolver",
    lead:
      "Risco no piso quase sempre vem de metal ou de sujeira em contato direto com o chão. Veja de onde vem o problema, compare as proteções mais usadas e saiba quando a solução é trocar a ponteira.",
    datePublished: publishedAt,
    dateModified: publishedAt,
    sections: [
      {
        id: "causas",
        title: "Por que a cadeira risca o piso",
        list: [
          "A ponteira caiu e a borda do tubo encosta no piso.",
          "A ponteira gastou até aparecer o metal, ou rachou.",
          "A ponteira está folgada e gira ou sai quando a cadeira é arrastada.",
          "Grãos de areia presos sob a ponteira ou o feltro funcionam como lixa."
        ]
      },
      {
        id: "opcoes",
        title: "Opções de proteção",
        paragraphs: [
          "Não existe uma proteção melhor para todos os casos. O ponto de partida é o tipo de pé: tubo com a ponta aberta, pé de madeira ou base plana."
        ],
        table: {
          caption: "Comparativo das proteções para pé de cadeira",
          columns: ["Opção", "Prós", "Contras"],
          rows: [
            ["Ponteira interna", "fica presa dentro do tubo, cobre a borda e não muda o desenho do pé", "precisa da medida certa do tubo e da parede"],
            ["Capa de silicone", "fácil de colocar e não exige medida exata", "aumenta o pé por fora e pode sair ou rasgar ao arrastar"],
            ["Feltro adesivo", "desliza bem e é silencioso", "o adesivo solta com o uso, prende areia e não serve em tubo aberto"],
            ["Deslizador com prego ou parafuso", "desliza bem em piso duro", "exige pé de madeira ou um furo para fixar"]
          ],
          note: "A Baseforma fabrica ponteiras internas e sapatas em TPU. Capas de silicone, feltros e deslizadores não fazem parte do catálogo."
        }
      },
      {
        id: "tipos-de-piso",
        title: "Porcelanato, laminado e madeira",
        paragraphs: [
          "Em qualquer piso, o que mais risca é metal exposto e areia. Laminado e madeira marcam com mais facilidade que porcelanato, então nesses pisos vale conferir as ponteiras com mais frequência e evitar arrastar a cadeira.",
          "O TPU usado nas peças da Baseforma é um plástico flexível que mantém o metal longe do piso. Ele faz seu papel enquanto a peça estiver inteira e bem encaixada."
        ]
      },
      {
        id: "quando-trocar",
        title: "Quando trocar a ponteira",
        list: [
          "Quando aparece metal ou a base está gasta de um lado.",
          "Quando a ponteira gira, sai com facilidade ou faz barulho.",
          "Quando racha ou perde pedaços.",
          "Ao trocar, substitua as ponteiras da cadeira inteira para os pés ficarem na mesma altura."
        ]
      },
      {
        id: "proximo-passo",
        title: "Próximo passo",
        paragraphs: [
          ["Para pé de tubo com a ponta aberta, meça o tubo seguindo o guia ", links.guiaMedir, " e configure a ponteira interna."],
          ["Para cadeira de base trenó, em que o tubo toca o chão pela lateral, use a ", links.sapataU, "."],
          ["Para pé de madeira ou base plana, veja a ", links.lisaRedonda, " ou a ", links.parafusoRedonda, "."]
        ]
      }
    ],
    cta: [
      { href: "/configurar/ponteira-interna-tubo", label: "Configurar ponteira para tubo", primary: true },
      { href: "/guias/como-medir-tubo-para-ponteira", label: "Como medir o tubo" }
    ]
  },
  {
    slug: "sapata-para-pe-de-madeira",
    title: "Sapata para pé de madeira: parafuso ou pino",
    description:
      "Como escolher a sapata para pé de cadeira, mesa ou poltrona de madeira: com parafuso, com pino de encaixe ou colada. Tamanho, altura e instalação.",
    heading: "Sapata para pé de madeira: como escolher e instalar",
    lead:
      "Pés de madeira de cadeira, mesa e poltrona pedem uma sapata que fique presa sem marcar o piso. Veja as formas de fixação, como escolher o tamanho e como instalar a sapata com parafuso.",
    datePublished: publishedAt,
    dateModified: publishedAt,
    sections: [
      {
        id: "fixacao",
        title: "Formas de fixação",
        table: {
          caption: "Como a sapata fica presa ao pé de madeira",
          columns: ["Fixação", "Como funciona", "No catálogo da Baseforma"],
          rows: [
            ["Parafuso central", "o parafuso atravessa a sapata e entra no pé; a cabeça fica embutida", "sapata com parafuso, redonda ou quadrada"],
            ["Pino de encaixe", "uma haste da sapata entra num furo do pé", "sapata lisa com pino"],
            ["Cola", "a sapata plana é colada na face do pé", "sapata lisa sem pino"],
            ["Prego ou adesivo de fábrica", "deslizadores e pezinhos prontos", "não fabricamos"]
          ]
        },
        paragraphs: [
          ["Veja a ", links.parafusoRedonda, ", a ", links.parafusoQuadrada, ", a ", links.lisaRedonda, " e a ", links.lisaQuadrada, "."]
        ]
      },
      {
        id: "tamanho",
        title: "Como escolher o tamanho",
        list: [
          "Meça a face do pé que toca o piso: o diâmetro em pé redondo, os dois lados em pé quadrado ou retangular.",
          "Use a mesma medida da face ou um pouco menos, para a sapata não aparecer além do pé.",
          "Escolha a altura da base, de 1 a 10 mm. Em cadeiras, sapatas baixas preservam a altura do assento.",
          "Na sapata com parafuso, a medida mínima é 12 mm, para sobrar material em volta do escareamento. A sapata lisa vai de 3 a 150 mm."
        ]
      },
      {
        id: "instalacao",
        title: "Instalação com parafuso",
        ordered: true,
        list: [
          "Marque o centro da face do pé.",
          "Faça um furo-guia no pé, mais fino que o parafuso, na profundidade do parafuso.",
          "Posicione a sapata, passe o parafuso pelo furo central e aperte até a cabeça assentar no escareamento.",
          "Não aperte demais: o TPU é flexível e deforma se for esmagado."
        ],
        paragraphs: [
          "O parafuso não acompanha a sapata. Escolha um parafuso para madeira com o diâmetro configurado (de 2 a 10 mm) e cabeça que caiba no escareamento, que tem o dobro desse diâmetro."
        ]
      },
      {
        id: "pe-de-tubo",
        title: "Pé de tubo não é pé de madeira",
        paragraphs: [
          ["Se o pé for um tubo de metal com a ponta aberta, a solução é a ponteira interna, que entra no tubo. Veja ", links.guiaInternaExterna, "."]
        ]
      }
    ],
    cta: [
      { href: "/configurar/sapata-com-parafuso", label: "Configurar sapata com parafuso", primary: true },
      { href: "/configurar/sapata-base-lisa", label: "Configurar sapata lisa" }
    ]
  }
];

export function getGuideBySlug(slug) {
  return guides.find((guide) => guide.slug === slug);
}

export function guidePath(slug) {
  return `/guias/${slug}`;
}

/** Article simples (schema.org) do guia, com a Baseforma como autora e editora. */
export function buildGuideArticleJsonLd(guide, { siteUrl, brand }) {
  const base = String(siteUrl).replace(/\/+$/, "");
  const url = `${base}${guidePath(guide.slug)}`;
  const organization = {
    "@type": "Organization",
    name: brand.name,
    url: `${base}/`
  };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.heading,
    description: guide.description,
    inLanguage: "pt-BR",
    datePublished: guide.datePublished,
    dateModified: guide.dateModified || guide.datePublished,
    mainEntityOfPage: url,
    url,
    image: [`${base}/brand/baseforma-og.png`],
    author: organization,
    publisher: {
      ...organization,
      logo: {
        "@type": "ImageObject",
        url: `${base}/brand/baseforma-mark.png`
      }
    }
  };
}
