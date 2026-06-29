import Link from "next/link";

export const metadata = {
  title: "Processo e material",
  description:
    "Conheça a base técnica da Baseforma: famílias parametrizadas, impressão 3D sob demanda, validação funcional e uso inicial de TPU.",
  alternates: {
    canonical: "/processo"
  }
};

export default function ProcessoPage() {
  return (
    <>
      <section className="page-panel narrow-panel">
        <p className="eyebrow">Base técnica</p>
        <h1>Impressão 3D aqui serve para organizar variedade, não para justificar improviso.</h1>
        <p className="lead">
          A combinação entre Rhino, Grasshopper e produção sob encomenda permite construir
          famílias coerentes, gerar arquivos padronizados e publicar variantes comerciais com
          menos fricção.
        </p>
      </section>

      <section className="grid-three">
        {[
          {
            number: "01",
            title: "Família paramétrica",
            description:
              "Cada tipologia nasce com parâmetros comerciais claros, presets aprovados e regras de compatibilidade publicáveis."
          },
          {
            number: "02",
            title: "Exportação consistente",
            description:
              "O arquivo técnico acompanha o SKU, reduzindo retrabalho, confusão de lote e dependência de memória operacional."
          },
          {
            number: "03",
            title: "Publicação por validação",
            description:
              "Nem toda possibilidade paramétrica vira produto. O catálogo publica apenas o que foi testado e defendido comercialmente."
          }
        ].map((item) => (
          <article key={item.number} className="surface-card story-card">
            <span className="count-pill">{item.number}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="two-column-panel">
        <article className="surface-card panel-copy">
          <strong>Por que TPU no início</strong>
          <p>
            O material inicial foi escolhido por oferecer uma combinação interessante de
            proteção de piso, aderência, leitura visual e comportamento elástico.
          </p>
          <ul className="feature-list">
            <li>bom ponto de partida para contato com piso</li>
            <li>mais liberdade de cor do que componentes tradicionais</li>
            <li>permite um componente menos agressivo visualmente</li>
          </ul>
        </article>

        <article className="surface-card panel-copy">
          <strong>O que precisa de validação por família</strong>
          <p>
            TPU não deve ser tratado como resposta universal. Cada família precisa registrar
            limite de carga, deformação esperada, piso recomendado e eventual migração para
            material mais rígido.
          </p>
          <ul className="feature-list">
            <li>encaixe real</li>
            <li>desgaste estético</li>
            <li>tempo de impressão</li>
            <li>resultado de uso continuado</li>
          </ul>
        </article>
      </section>

      <section className="cta-banner">
        <div>
          <p className="eyebrow">Biblioteca técnica</p>
          <h2>O catálogo é a interface pública dessa lógica produtiva.</h2>
          <p>
            Quem entra pela busca precisa entender rapidamente em que família começar. Quem
            já compra recorrente precisa reencontrar a variante sem rediscutir tudo.
          </p>
        </div>
        <div className="action-row">
          <Link className="button button-primary" href="/catalogo">
            Explorar famílias
          </Link>
          <Link className="button button-secondary" href="/projeto-especial">
            Falar de um caso especial
          </Link>
        </div>
      </section>
    </>
  );
}
