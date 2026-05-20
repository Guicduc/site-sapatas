import Link from "next/link";

import { StructuredData } from "@/components/structured-data";

const faqSections = [
  {
    title: "Escolha e medida",
    items: [
      {
        question: "Como escolho a família certa?",
        answer:
          "Comece pelo tipo de apoio: ponteira interna para tubo ou sapata para base lisa. Depois escolha o formato e informe as medidas reais do seu projeto."
      },
      {
        question: "Qual é o limite de medida?",
        answer:
          "As famílias atuais trabalham com medidas customizáveis até 100 x 100 mm. Pedidos fora desse envelope devem entrar como projeto especial."
      },
      {
        question: "Preciso enviar desenho técnico?",
        answer:
          "Não necessariamente. Para casos simples, as medidas do configurador bastam. Se houver encaixe incomum, folga crítica ou geometria especial, envie referências pelo fluxo de projeto especial."
      }
    ]
  },
  {
    title: "Compra e produção",
    items: [
      {
        question: "Existe quantidade mínima?",
        answer:
          "Não. A linha atual não aplica quantidade mínima; você pode configurar e pedir a quantidade necessária para o seu caso."
      },
      {
        question: "Como o preço é calculado?",
        answer:
          "O preço parte da família, do formato, das medidas e da quantidade configurada. O carrinho consolida os itens antes do envio do pedido."
      },
      {
        question: "Qual é o prazo de produção?",
        answer:
          "O prazo aparece no produto configurado e pode variar conforme família, medida e fila de produção. Projetos especiais levam mais tempo porque exigem avaliação técnica."
      }
    ]
  },
  {
    title: "Material e acabamento",
    items: [
      {
        question: "Qual cor está disponível agora?",
        answer:
          "A cor padrão da linha atual é preta. Outras cores podem ser discutidas como demanda especial quando fizerem sentido para o projeto."
      },
      {
        question: "Existe acabamento adicional?",
        answer:
          "Não na linha atual. As peças são tratadas como componentes funcionais sob medida, com material e acabamento padrão de produção."
      },
      {
        question: "O material serve para área interna e externa?",
        answer:
          "O material foi escolhido para uso resistente, mas a aplicação real ainda deve considerar carga, piso, exposição e atrito. Casos críticos devem ser avaliados antes da compra."
      }
    ]
  }
];

export const metadata = {
  title: "FAQ técnico e comercial",
  description:
    "Perguntas frequentes sobre sapatas customizáveis: medidas, compra, produção, material, acabamento e projeto especial.",
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
          <h1>Respostas diretas para configurar, comprar ou abrir um caso especial.</h1>
          <p className="lead">
            Use esta página para decidir se o pedido entra pelo configurador, pelo carrinho ou
            pelo fluxo de projeto especial.
          </p>
        </div>
        <div className="faq-hero__aside">
          <span>Antes de pedir</span>
          <strong>Meça o apoio real e escolha a família pelo tipo de encaixe.</strong>
          <p>
            Tubo interno e base lisa seguem lógicas diferentes. Quando a medida, o formato ou o
            uso saem do padrão, o melhor caminho é projeto especial.
          </p>
        </div>
      </section>

      <section className="faq-routing" aria-label="Caminhos principais">
        <article>
          <span>01</span>
          <strong>Configure</strong>
          <p>Escolha família, formato, medida e quantidade no catálogo.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Revise</strong>
          <p>Confira preço, prazo e itens no carrinho antes de enviar.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Encaminhe</strong>
          <p>Use projeto especial para geometrias, cores ou usos fora da linha atual.</p>
        </article>
      </section>

      <section className="faq-layout">
        <aside className="faq-sidebar">
          <p className="eyebrow">Atalhos</p>
          <h2>O que normalmente define o caminho</h2>
          <ul className="feature-list">
            <li>tipo de apoio ou tubo</li>
            <li>medida externa ou interna real</li>
            <li>quantidade necessária</li>
            <li>uso interno, externo ou critico</li>
            <li>necessidade de cor ou geometria especial</li>
          </ul>
          <div className="action-column">
            <Link className="button button-primary button-block" href="/catalogo">
              Abrir catálogo
            </Link>
            <Link className="button button-secondary button-block" href="/projeto-especial">
              Projeto especial
            </Link>
          </div>
        </aside>

        <div className="faq-content">
          {faqSections.map((section) => (
            <article key={section.title} className="faq-section">
              <div className="faq-section__heading">
                <p className="eyebrow">Perguntas frequentes</p>
                <h2>{section.title}</h2>
              </div>
              <div className="faq-stack">
                {section.items.map((item, index) => (
                  <details key={item.question} open={index === 0}>
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
          <p className="eyebrow">Ainda ficou dúvida?</p>
          <h2>Se a resposta muda conforme medida ou uso, trate como decisão técnica.</h2>
          <p>
            O configurador resolve os casos padrão. Casos com tolerância crítica, carga incomum
            ou requisito estético específico devem entrar pelo briefing.
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
