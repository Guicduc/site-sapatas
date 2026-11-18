import Link from "next/link";

import { buildPageMetadata } from "@/lib/page-metadata";
import { pageSeo } from "@/lib/seo-copy";

const steps = [
  {
    number: "1",
    title: "Escolha o modelo",
    description:
      "Pelo tipo de encaixe: ponteira interna para tubo redondo, metalon ou tubo oblongo; ponteira bola; sapata lisa ou com parafuso para pé plano; ou sapata U para o tubo da base trenó."
  },
  {
    number: "2",
    title: "Meça o móvel",
    description:
      "Meça a peça real, de preferência com paquímetro: a medida externa e a parede do tubo, ou a face do pé que toca o piso. A medida nominal do tubo não basta."
  },
  {
    number: "3",
    title: "Configure e veja o preço",
    description:
      "Informe as medidas, a cor (preto, branco, cinza ou marrom) e a quantidade. O configurador confere se a peça pode ser fabricada e mostra preço e prazo de produção na hora, sem pedido mínimo."
  },
  {
    number: "4",
    title: "Pague com segurança",
    description:
      "No carrinho você calcula o frete pelo CEP, informa CPF ou CNPJ para a nota fiscal, cria o pedido e paga pelo Mercado Pago."
  },
  {
    number: "5",
    title: "Produção sob encomenda",
    description:
      "A produção começa depois da aprovação do pagamento. Cada peça é impressa em 3D, em TPU, na medida do pedido, e segue com nota fiscal eletrônica."
  },
  {
    number: "6",
    title: "Recompra pelo mesmo código",
    description:
      "Cada configuração gera um código (SKU) com as medidas. Na sua conta, os pedidos anteriores ficam guardados com medidas, cor e quantidade para você repetir a compra."
  }
];

export const metadata = buildPageMetadata(pageSeo.comoFunciona);

export default function ComoFuncionaPage() {
  return (
    <>
      <section className="page-panel narrow-panel">
        <p className="eyebrow">Como comprar</p>
        <h1>Como funciona: da medida do tubo à entrega</h1>
        <p className="lead">
          Você escolhe o modelo, informa as medidas reais do móvel, confere preço e prazo na hora
          e paga pelo Mercado Pago. A ponteira ou sapata é produzida depois da aprovação do
          pagamento e enviada com nota fiscal.
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
          <strong>Antes de configurar, tenha em mãos</strong>
          <ul className="feature-list">
            <li>a medida externa do tubo ou da face de apoio do pé</li>
            <li>a espessura da parede, no caso de tubos</li>
            <li>a quantidade de peças e a cor</li>
            <li>o CEP de entrega e o CPF ou CNPJ para a nota fiscal</li>
          </ul>
        </article>

        <article className="surface-card panel-copy">
          <strong>Quando abrir um projeto especial</strong>
          <ul className="feature-list">
            <li>medida fora da faixa do configurador</li>
            <li>formato que não está no catálogo</li>
            <li>aplicação com carga, exposição ou tolerância crítica</li>
            <li>lote para fábrica, serralheria ou marcenaria com necessidade própria</li>
          </ul>
          <p>
            Descreva o caso no <Link href="/projeto-especial">projeto especial</Link> e a
            Baseforma responde por e-mail.
          </p>
        </article>
      </section>
    </>
  );
}
