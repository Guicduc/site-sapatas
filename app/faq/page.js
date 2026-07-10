import Link from "next/link";

import { StructuredData } from "@/components/structured-data";

const faqSections = [
  {
    id: "medidas",
    eyebrow: "Antes de configurar",
    title: "Medidas e compatibilidade",
    description:
      "Use estas respostas para escolher a família certa e evitar peça folgada, apertada ou fora da faixa validada.",
    items: [
      {
        question: "Como escolho a família certa?",
        answer:
          "Comece pelo tipo de apoio e pela forma de encaixe. Depois escolha o formato, confira a faixa publicada e informe as medidas reais do seu projeto."
      },
      {
        question: "Como devo medir antes de configurar?",
        answer:
          "Meça a peça real, não apenas a medida nominal do móvel. Use a dimensão do ponto de encaixe ou da área de apoio que receberá o componente."
      },
      {
        question: "Qual é o limite de medida?",
        answer:
          "As famílias atuais trabalham com medidas customizáveis até 150 x 150 mm. Pedidos fora desse envelope devem entrar como projeto especial."
      },
      {
        question: "Preciso enviar desenho técnico?",
        answer:
          "Não necessariamente. Para casos simples, as medidas do configurador bastam. Se houver encaixe incomum, folga crítica ou geometria especial, envie referências pelo fluxo de projeto especial."
      }
    ]
  },
  {
    id: "compra",
    eyebrow: "Pedido e pagamento",
    title: "Compra, preço e pagamento",
    description:
      "O checkout cria um pedido próprio da Baseforma antes de encaminhar o pagamento pelo Mercado Pago.",
    items: [
      {
        question: "Existe quantidade mínima?",
        answer:
          "Não. A linha atual não aplica quantidade mínima; você pode configurar desde 1 unidade. Quantidades maiores podem alterar preço unitário e prazo."
      },
      {
        question: "Quais formas de pagamento estão disponíveis?",
        answer:
          "O pagamento ativo é Mercado Pago. Depois que o pedido local é criado, você é encaminhado para o checkout do Mercado Pago com as opções disponíveis naquele ambiente."
      },
      {
        question: "O pedido já sai com nota fiscal?",
        answer:
          "A nota fiscal é acompanhada pelo fluxo operacional via Mercado Pago após a aprovação do pagamento. Informe os dados corretos no pedido para evitar pendência antes da expedição."
      }
    ]
  },
  {
    id: "prazo",
    eyebrow: "Produção e entrega",
    title: "Prazo e entrega",
    description:
      "Separe prazo de produção e prazo de transporte: os dois entram na expectativa final de entrega.",
    items: [
      {
        question: "Qual é o prazo de produção?",
        answer:
          "O prazo aparece no produto configurado e pode variar conforme família, medida e fila de produção. Projetos especiais levam mais tempo porque exigem avaliação técnica."
      },
      {
        question: "Quando a produção começa?",
        answer:
          "O pedido entra em produção logo após a aprovação do pagamento."
      },
      {
        question: "Como o frete é calculado?",
        answer:
          "O carrinho estima o frete a partir do CEP e dos itens configurados. Quando a integração de frete real estiver ativa, a cotação usa o Melhor Envio; sem credenciais, o site preserva o cálculo manual."
      }
    ]
  },
  {
    id: "material",
    eyebrow: "Material",
    title: "Material e acabamento",
    description:
      "As respostas abaixo indicam o padrão atual da linha e quando vale tratar o pedido como projeto técnico.",
    items: [
      {
        question: "O material serve para área interna e externa?",
        answer:
          "Sim. O material pode ser usado em áreas internas e externas e pode substituir o feltro quando a aplicação pede uma solução sob medida, mais estável e com encaixe definido."
      },
      {
        question: "Quando devo abrir um projeto especial?",
        answer:
          "Abra projeto especial quando a medida passar da faixa publicada, a geometria não existir no catálogo ou a aplicação tiver carga, exposição ou tolerância crítica."
      }
    ]
  }
];

const faqPaths = [
  {
    step: "01",
    title: "Configurador",
    href: "/catalogo",
    label: "Abrir catálogo",
    body: "Use quando a família, o formato e as medidas estiverem dentro da faixa publicada."
  },
  {
    step: "02",
    title: "Carrinho",
    href: "/carrinho",
    label: "Revisar carrinho",
    body: "Revise quantidade, preço, frete estimado e dados do pedido antes do pagamento."
  },
  {
    step: "03",
    title: "Projeto especial",
    href: "/projeto-especial",
    label: "Enviar briefing",
    body: "Use para medidas fora da matriz, geometria nova ou aplicação crítica."
  }
];

export const metadata = {
  title: "FAQ técnico e comercial",
  description:
    "Perguntas frequentes sobre sapatas customizáveis: medidas, compra, pagamento, frete, produção, material e projeto especial.",
  alternates: {
    canonical: "/faq"
  }
};

export default function FaqPage() {
  const mainEntity = faqSections.flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  );

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity
        }}
      />

      <section className="faq-hero">
        <div>
          <p className="eyebrow">FAQ técnico-comercial</p>
          <h1>FAQ para medir, configurar e comprar sapatas sob medida.</h1>
          <p className="lead">
            Respostas práticas para decidir se o pedido segue pelo configurador, pelo carrinho ou
            pelo fluxo de projeto especial.
          </p>
          <div className="faq-hero__actions" aria-label="Ações principais">
            <Link className="button button-primary" href="/catalogo">
              Abrir catálogo
            </Link>
            <Link className="button button-secondary" href="/projeto-especial">
              Projeto especial
            </Link>
          </div>
        </div>
      </section>

      <section className="faq-routing" aria-label="Caminhos principais">
        {faqPaths.map((path) => (
          <article key={path.title}>
            <span>{path.step}</span>
            <strong>{path.title}</strong>
            <p>{path.body}</p>
            <Link className="faq-routing__link" href={path.href}>
              {path.label}
            </Link>
          </article>
        ))}
      </section>

      <section className="faq-layout">
        <div className="faq-content">
          {faqSections.map((section, sectionIndex) => (
            <article key={section.title} id={section.id} className="faq-section">
              <div className="faq-section__heading">
                <p className="eyebrow">{section.eyebrow}</p>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <div className="faq-stack">
                {section.items.map((item, index) => (
                  <details key={item.question} open={sectionIndex === 0 && index === 0}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <div>
          <p className="eyebrow">Ficou em dúvida?</p>
          <h2>Precisa de um desenho específico?</h2>
          <p>
            O configurador resolve os casos da matriz atual. Casos com tolerância crítica, carga
            incomum ou requisito estético específico devem entrar pelo briefing.
          </p>
        </div>
        <div className="action-row">
          <Link className="button button-primary" href="/catalogo">
            Configurar agora
          </Link>
          <Link className="button button-secondary" href="/projeto-especial">
            Enviar briefing
          </Link>
        </div>
      </section>
    </>
  );
}
