// Title e meta description das paginas institucionais indexaveis.
// Fonte dos termos: docs/seo/keyword-research.md, secao (c).
// `title` vai sem a marca: buildPageMetadata acrescenta " | Baseforma" (11 caracteres),
// entao o limite aqui e 49 caracteres para o total ficar em ate 60. Description: ate 155.
// test/seo-content.test.js valida esses limites.

export const pageSeo = {
  home: {
    title: "Ponteiras e sapatas sob medida para móveis",
    description:
      "Ponteira interna para tubo redondo, metalon e oblongo, e sapatas para pés de móveis, feitas na medida do seu tubo em TPU. Sem pedido mínimo.",
    path: "/"
  },
  catalogo: {
    title: "Catálogo de ponteiras e sapatas para móveis",
    description:
      "Ponteira interna para tubo e metalon, sapata lisa, com parafuso, ponteira bola e sapata para base trenó. Informe a medida e veja o preço na hora.",
    path: "/catalogo"
  },
  comoFunciona: {
    title: "Como comprar ponteira e sapata sob medida",
    description:
      "Escolha o modelo, informe a medida externa e a parede do tubo, confira o preço na hora e receba a peça produzida sob encomenda. Veja o passo a passo.",
    path: "/como-funciona"
  },
  processo: {
    title: "Ponteiras em TPU feitas por impressão 3D",
    description:
      "Por que TPU: plástico flexível que segura no tubo e protege o piso. Veja como cada ponteira e sapata é modelada na sua medida e impressa em 3D.",
    path: "/processo"
  },
  projetoEspecial: {
    title: "Ponteira ou sapata personalizada para seu móvel",
    description:
      "Precisa de uma ponteira fora do catálogo, de uma peça de reposição que saiu de linha ou de um lote para sua fábrica? Envie medidas ou foto e orçamos.",
    path: "/projeto-especial"
  },
  faq: {
    title: "Dúvidas sobre ponteiras e sapatas para móveis",
    description:
      "Como medir o tubo, a diferença entre ponteira interna e externa, cores, prazo, frete e compra em quantidade: respostas sobre ponteiras e sapatas.",
    path: "/faq"
  }
};
