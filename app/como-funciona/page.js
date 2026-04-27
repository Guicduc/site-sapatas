const steps = [
  {
    number: "1",
    title: "Escolha da família",
    description:
      "O cliente entra por busca orgânica, navegação no catálogo ou indicação. A família organiza o tipo de uso e a regra de compatibilidade."
  },
  {
    number: "2",
    title: "Seleção da variante padrão",
    description:
      "Quando a combinação já existe, a página mostra preço público, cor, lead time e a faixa dimensional validada."
  },
  {
    number: "3",
    title: "Confirmação técnica",
    description:
      "Para clientes B2B, a recompra pode acontecer pelo SKU. Para especificação nova, a página já indica o que precisa ser conferido."
  },
  {
    number: "4",
    title: "Produção sob encomenda",
    description:
      "A variante aprovada entra na fila de impressão, inspeção e expedição sem depender de estoque alto de produto acabado."
  },
  {
    number: "5",
    title: "Projeto especial",
    description:
      "Se a demanda sair da matriz, o cliente não precisa abandonar o funil. Ele abre um briefing estruturado com a família de referência."
  },
  {
    number: "6",
    title: "Nova família ou novo preset",
    description:
      "O time decide se o caso gera apenas uma variante privada, um novo preset catalogável ou uma nova tipologia premium."
  }
];

export const metadata = {
  title: "Como funciona",
  description:
    "Entenda o fluxo da Traço Base: escolha de família, validação de variante, produção sob encomenda e projeto especial.",
  alternates: {
    canonical: "/como-funciona"
  }
};

export default function ComoFuncionaPage() {
  return (
    <>
      <section className="page-panel narrow-panel">
        <p className="eyebrow">Fluxo comercial</p>
        <h1>Da família certa ao arquivo certo, sem improviso no meio do caminho.</h1>
        <p className="lead">
          O negócio foi desenhado para unir uma biblioteca paramétrica com uma interface
          comercial simples. Isso vale para a linha padrão e para o desenvolvimento especial.
        </p>
      </section>

      <section className="timeline-grid">
        {steps.map((step) => (
          <article key={step.number} className="surface-card timeline-card">
            <span className="count-pill">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </section>

      <section className="two-column-panel">
        <article className="surface-card panel-copy">
          <strong>O que a linha padrão precisa responder sozinha</strong>
          <ul className="feature-list">
            <li>aplicação principal</li>
            <li>tipo de fixação</li>
            <li>faixa de compatibilidade</li>
            <li>preço e lead time</li>
            <li>CTA para recompra ou suporte</li>
          </ul>
        </article>

        <article className="surface-card panel-copy">
          <strong>O que o projeto especial precisa capturar</strong>
          <ul className="feature-list">
            <li>medidas exatas e contexto de uso</li>
            <li>quantidade prevista</li>
            <li>restrições estéticas</li>
            <li>material e acabamento desejados</li>
            <li>referência de família, se existir</li>
          </ul>
        </article>
      </section>
    </>
  );
}
