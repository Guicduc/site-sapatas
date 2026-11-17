import Link from "next/link";
import { buildPageMetadata } from "@/lib/page-metadata";
import { pageSeo } from "@/lib/seo-copy";

export const metadata = buildPageMetadata(pageSeo.processo);

export default function ProcessoPage() {
  return (
    <>
      <section className="page-panel narrow-panel">
        <p className="eyebrow">Material e processo</p>
        <h1>Material e processo: TPU impresso em 3D sob demanda</h1>
        <p className="lead">
          Cada ponteira e sapata é desenhada a partir das medidas do pedido e impressa em 3D em
          TPU, um material flexível. Não há estoque de peça pronta: a produção começa depois da
          aprovação do pagamento.
        </p>
      </section>

      <section className="grid-three">
        {[
          {
            number: "01",
            title: "Desenho a partir da sua medida",
            description:
              "Cada produto tem um modelo digital que se ajusta às medidas informadas: diâmetro ou lados, parede do tubo e alturas. As regras de fabricação, como o vão interno mínimo de 5 mm nas ponteiras, são conferidas antes de o pedido ser criado."
          },
          {
            number: "02",
            title: "Código com as medidas",
            description:
              "Cada configuração gera um código (SKU) com as medidas. O arquivo de produção acompanha esse código, o que evita troca de peças entre pedidos e facilita a recompra."
          },
          {
            number: "03",
            title: "Só o que foi testado",
            description:
              "O catálogo publica apenas formatos e faixas de medida que foram validados. O que fica fora disso é avaliado caso a caso no projeto especial."
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
          <strong>Por que TPU</strong>
          <p>
            TPU (poliuretano termoplástico) é um elastômero termoplástico: tem elasticidade
            parecida com a da borracha, mas é processado como plástico. Por isso pode ser impresso
            em 3D na medida exata de cada peça.
          </p>
          <ul className="feature-list">
            <li>flexível, o que ajuda o encaixe por pressão a segurar no tubo</li>
            <li>mantém o metal do pé longe do piso</li>
            <li>disponível em preto, branco, cinza e marrom</li>
            <li>dispensa molde: dá para produzir a partir de 1 unidade</li>
          </ul>
        </article>

        <article className="surface-card panel-copy">
          <strong>O que avaliamos em cada família</strong>
          <p>
            TPU não é resposta para tudo. Cada família tem limites de medida e de uso definidos a
            partir de testes. Aplicações com carga, exposição ou tolerância crítica devem passar
            pelo projeto especial.
          </p>
          <ul className="feature-list">
            <li>encaixe no tubo ou no pé real</li>
            <li>desgaste e aparência com o uso</li>
            <li>comportamento com carga</li>
            <li>tempo de produção</li>
          </ul>
        </article>
      </section>

      <section className="cta-banner">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2>Escolha a peça pelo tipo de encaixe</h2>
          <p>
            Ponteira interna para tubo, sapata lisa, sapata com parafuso, ponteira bola ou sapata U
            para base trenó: todas feitas pela sua medida.
          </p>
        </div>
        <div className="action-row">
          <Link className="button button-primary" href="/catalogo">
            Ver catálogo
          </Link>
          <Link className="button button-secondary" href="/projeto-especial">
            Falar de um caso especial
          </Link>
        </div>
      </section>
    </>
  );
}
