const flatTip = "Sem furo no móvel? Deixe a haste desativada: a sapata funciona como apoio plano.";

const tubeCommonSteps = [
  "Meça a espessura da parede na boca do tubo e informe em Parede tubo: o encaixe interno é o tamanho da base menos duas paredes.",
  "Altura pescoço é o quanto a sapata entra no tubo; altura base é a espessura que fica aparente."
];

const flatNeckStep =
  "Se o pé tem furo para pino, ative Haste: meça o diâmetro do furo (Diâmetro da haste) e a profundidade útil (Altura da haste).";

export const measurementGuides = {
  "ponteira-interna-tubo": {
    redondo: {
      title: "Como medir o tubo redondo",
      steps: [
        "Com um paquímetro, meça o diâmetro externo do tubo onde a sapata vai entrar e informe em Tamanho base: a sapata fica alinhada com o lado de fora do tubo.",
        ...tubeCommonSteps
      ]
    },
    quadrado: {
      title: "Como medir o tubo quadrado",
      steps: [
        "Com um paquímetro, meça os dois lados externos do tubo e informe em Tamanho base X e Y: a sapata fica alinhada com o lado de fora do tubo.",
        ...tubeCommonSteps
      ]
    },
    oblongo: {
      title: "Como medir o tubo oblongo",
      steps: [
        "Com um paquímetro, meça o perfil por fora: o lado maior vai em Tamanho base X e o lado menor em Tamanho base Y.",
        ...tubeCommonSteps
      ]
    }
  },
  "sapata-base-lisa": {
    redonda: {
      title: "Como medir a base redonda",
      steps: [
        "Meça o diâmetro do pé ou da base do móvel onde a sapata vai apoiar e informe em Diametro.",
        "Altura da base é a espessura da sapata: aumente o valor para ganhar altura ou nivelar o móvel.",
        flatNeckStep
      ],
      tip: flatTip
    },
    quadrada: {
      title: "Como medir a base quadrada",
      steps: [
        "Meça os dois lados da base do móvel onde a sapata vai apoiar e informe em Tamanho base X e Y.",
        "Altura da base é a espessura da sapata: aumente o valor para ganhar altura ou nivelar o móvel.",
        flatNeckStep
      ],
      tip: flatTip
    }
  }
};

export function getMeasurementGuide(categorySlug, formatSlug) {
  return measurementGuides[categorySlug]?.[formatSlug] || null;
}
