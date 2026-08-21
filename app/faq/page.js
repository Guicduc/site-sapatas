import Link from "next/link";

import { StructuredData } from "@/components/structured-data";

const faqSections = [
  {
    id: "medidas",
    eyebrow: "Antes de configurar",
    title: "Medidas e compatibilidade",
    items: [
      {
        question: "Como escolho a família certa?",
        answer:
          "Comece pelo ponto de instalação: dentro de um tubo redondo, quadrado ou oblongo, ou sob uma base lisa. Depois escolha o formato e informe as medidas reais da peça."
      },
      {
        question: "Como devo medir antes de configurar?",
        answer:
          "Meça a peça real, não apenas a medida nominal do móvel. Use as dimensões internas do tubo ou a área de apoio que receberá a sapata."
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
    items: [
      {
        question: "Existe quantidade mínima?",
        answer:
          "Não. A linha atual não aplica quantidade mínima; você pode configurar desde 1 unidade. Quantidades maiores podem alterar preço unitário e prazo."
      },
      {
        question: "Quais formas de pagamento estão disponíveis?",
        answer:
          "O pagamento é feito pelo Mercado Pago. Depois de revisar e criar o pedido, você segue para o ambiente seguro de pagamento e escolhe uma das opções disponíveis."
      },
      {
        question: "O pedido já sai com nota fiscal?",
        answer:
          "Sim. A nota fiscal eletrônica é emitida automaticamente depois que o pagamento é aprovado, com os dados informados no pedido. Por isso o checkout exige CPF ou CNPJ: dados incorretos geram pendência fiscal antes da expedição."
      }
    ]
  },
  {
    id: "prazo",
    eyebrow: "Produção e entrega",
    title: "Prazo e entrega",
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
          "Informe o CEP no carrinho para ver o valor e o prazo estimado de entrega. O cálculo considera o destino e os itens configurados antes da criação do pedido."
      }
    ]
  },
  {
    id: "material",
    eyebrow: "Material",
    title: "Material e acabamento",
    items: [
      {
        question: "O material serve para área interna e externa?",
        answer:
          "A linha atual pode atender áreas internas e externas, mas a escolha depende da carga, do piso e da exposição. Para uso crítico, envie o contexto como projeto especial."
      },
      {
        question: "Quando devo abrir um projeto especial?",
        answer:
          "Abra projeto especial quando a medida passar da faixa publicada, a geometria não existir no catálogo ou a aplicação tiver carga, exposição ou tolerância crítica."
      }
    ]
  },
  {
    id: "pos-compra",
    eyebrow: "Depois da compra",
    title: "Cancelamento, devolução e garantia",
    description:
      "Peças sob medida também têm direito de arrependimento. As regras completas ficam nas páginas de condições de venda e de trocas.",
    items: [
      {
        question: "Posso cancelar o pedido?",
        answer:
          "Sem custo enquanto o pagamento não for aprovado. Depois da aprovação a produção começa e a peça passa a ser feita para o seu pedido, então o cancelamento antes da expedição depende do estágio da produção. Peça por e-mail o quanto antes, com o número do pedido.",
        link: { href: "/trocas", label: "Ver política de cancelamento" }
      },
      {
        question: "Posso devolver se eu desistir da compra?",
        answer:
          "Sim. Por ser compra a distância, você tem 7 dias corridos após o recebimento para desistir sem justificar, inclusive em itens configurados sob medida. A devolução do valor pago inclui o frete do pedido, e o custo do envio de retorno é da Baseforma.",
        link: { href: "/trocas", label: "Como solicitar a devolução" }
      },
      {
        question: "E se a peça chegar diferente ou com defeito?",
        answer:
          "Se a peça não corresponder ao pedido, a troca é feita sem custo. Para vício aparente, o prazo de reclamação é de 90 dias após o recebimento e a Baseforma tem até 30 dias para sanar o problema. Peça diferente do esperado por medida informada errada não é defeito, mas ainda cabe no prazo de 7 dias.",
        link: { href: "/trocas", label: "Trocas e devoluções" }
      }
    ]
  }
];

export const metadata = {
  title: "Perguntas frequentes",
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

      <section className="faq-hero" aria-labelledby="faq-title">
        <div className="faq-hero__copy">
          <p className="eyebrow">Perguntas frequentes</p>
          <h1 id="faq-title">O que você precisa saber antes de pedir.</h1>
          <p className="lead">
            Encontre respostas sobre medidas, pagamento, prazo, frete e material. Se a peça sair
            da faixa do catálogo, mostramos quando abrir um projeto especial.
          </p>
        </div>

        <nav className="faq-topic-nav" aria-label="Assuntos da FAQ">
          <p className="eyebrow">Encontre por assunto</p>
          <div className="faq-topic-nav__links">
            {faqSections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{section.title}</strong>
                <span aria-hidden="true">↓</span>
              </a>
            ))}
          </div>
        </nav>
      </section>

      <section className="faq-layout">
        <div className="faq-content">
          {faqSections.map((section, sectionIndex) => (
            <article key={section.title} id={section.id} className="faq-section">
              <div className="faq-section__heading">
                <div className="faq-section__label">
                  <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                  <p className="eyebrow">{section.eyebrow}</p>
                </div>
                <h2>{section.title}</h2>
              </div>
              <div className="faq-stack">
                {section.items.map((item, index) => (
                  <details key={item.question} open={sectionIndex === 0 && index === 0}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                    {item.link ? (
                      <Link className="faq-routing__link" href={item.link.href}>
                        {item.link.label}
                      </Link>
                    ) : null}
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <div>
          <p className="eyebrow">Próximo passo</p>
          <h2>Não encontrou a peça que precisa?</h2>
          <p>
            Configure uma opção do catálogo ou envie as medidas e o contexto do seu projeto para
            avaliarmos uma solução especial.
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
