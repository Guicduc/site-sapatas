import Link from "next/link";

import { LegalSupplierIdentity } from "@/components/legal-supplier-identity";
import { buildMailtoUrl } from "@/lib/format";
import { company } from "@/lib/site-data";

export const metadata = {
  title: "Trocas e devoluções",
  description:
    "Política de trocas, devoluções, direito de arrependimento em 7 dias, garantia legal e reembolso dos pedidos Baseforma.",
  alternates: {
    canonical: "/trocas"
  }
};

const lastUpdated = "20 de agosto de 2026";

export default function ReturnsPage() {
  return (
    <div className="legal-page">
      <section className="page-panel legal-hero">
        <p className="eyebrow">Trocas e devoluções</p>
        <h1>Arrependimento, troca, devolução e reembolso</h1>
        <p>
          Esta página explica o que fazer quando você desiste da compra, quando a peça chega
          diferente do pedido e quando o produto apresenta defeito. Todos os pedidos começam pelo
          mesmo canal: um e-mail para o atendimento com o número do pedido.
        </p>
        <p className="legal-hero__updated">Atualizado em {lastUpdated}.</p>
      </section>

      <section className="page-panel legal-section" aria-labelledby="withdrawal-title">
        <div>
          <p className="eyebrow">7 dias</p>
          <h2 id="withdrawal-title">Direito de arrependimento</h2>
        </div>
        <div className="legal-copy">
          <p>
            Como a compra é feita a distância, você pode desistir dela em até 7 dias corridos
            contados do recebimento do produto, sem precisar justificar, conforme o art. 49 do
            Código de Defesa do Consumidor. Esse direito vale também para as peças configuradas sob
            medida.
          </p>
          <p>Para exercer o arrependimento:</p>
          <ol>
            <li>
              Envie um e-mail para{" "}
              <a href={buildMailtoUrl(company.supportEmail, "Arrependimento de compra")}>
                {company.supportEmail}
              </a>{" "}
              dentro dos 7 dias, informando o número do pedido e quais itens deseja devolver.
            </li>
            <li>
              A Baseforma responde confirmando o pedido de devolução e informando como enviar as
              peças de volta. O custo do envio de retorno é da Baseforma.
            </li>
            <li>
              Envie as peças de volta pelo meio indicado, preferencialmente na embalagem original e
              com todos os itens recebidos.
            </li>
            <li>
              Depois de recebida a devolução, a Baseforma devolve tudo o que você pagou, incluindo
              o frete cobrado no pedido.
            </li>
          </ol>
          <p>
            Não é necessário que a peça esteja sem uso para exercer o arrependimento, mas informe no
            e-mail se ela foi instalada ou testada, porque isso muda as instruções de retorno.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="wrong-item-title">
        <div>
          <p className="eyebrow">Divergência</p>
          <h2 id="wrong-item-title">Peça diferente do que foi pedido</h2>
        </div>
        <div className="legal-copy">
          <p>
            Se a peça recebida não corresponder ao que consta no pedido e na nota fiscal — medida,
            formato, cor, acabamento ou quantidade — a troca é feita sem nenhum custo para você.
          </p>
          <p>
            Envie um e-mail com o número do pedido, uma foto da peça recebida e, se possível, uma
            foto da medição com paquímetro, régua ou trena. A Baseforma refaz a peça correta ou,
            se você preferir, devolve o valor pago.
          </p>
          <p>
            Situação diferente: quando a peça corresponde exatamente às medidas que você informou
            no configurador, mas não encaixou no móvel, não se trata de divergência nem de defeito.
            Nesse caso o caminho é o direito de arrependimento em 7 dias descrito acima, ou uma nova
            compra com a medida corrigida. Se ainda estiver dentro do prazo, fale com o atendimento
            antes de comprar novamente.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="defect-title">
        <div>
          <p className="eyebrow">90 dias</p>
          <h2 id="defect-title">Produto com defeito</h2>
        </div>
        <div className="legal-copy">
          <p>
            O prazo para reclamar de vício aparente ou de fácil constatação é de 90 dias contados do
            recebimento, conforme o art. 26, II do Código de Defesa do Consumidor. Vícios ocultos
            contam a partir do momento em que ficam evidentes.
          </p>
          <p>
            Recebida a reclamação, a Baseforma tem até 30 dias para sanar o problema, conforme o
            art. 18 do mesmo código. Se não for sanado nesse prazo, você escolhe entre a
            substituição da peça, a devolução do valor pago corrigido ou o abatimento proporcional
            do preço.
          </p>
          <p>
            Não são considerados defeito o desgaste natural de uso, danos por instalação inadequada,
            carga acima da aplicação prevista, corte, perfuração ou modificação da peça, nem
            variação de tonalidade dentro do padrão do material.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="refund-title">
        <div>
          <p className="eyebrow">Reembolso</p>
          <h2 id="refund-title">Como o dinheiro volta</h2>
        </div>
        <div className="legal-copy">
          <p>
            A solicitação de reembolso é tratada pelo atendimento e processada no Mercado Pago de
            acordo com o meio usado na compra. O prazo para o crédito aparecer depende do meio de
            pagamento e das regras da instituição financeira responsável.
          </p>
          <p>
            Quando o pedido é devolvido integralmente, a nota fiscal eletrônica é cancelada ou
            recebe o documento fiscal de devolução correspondente, conforme o prazo permitido pela
            SEFAZ. Guarde a nota até a conclusão do processo.
          </p>
          <p>
            Em devolução parcial, o reembolso cobre os itens devolvidos. O frete é devolvido junto
            quando a devolução é integral ou quando decorre de divergência ou defeito.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="cancel-title">
        <div>
          <p className="eyebrow">Antes da entrega</p>
          <h2 id="cancel-title">Cancelamento do pedido</h2>
        </div>
        <div className="legal-copy">
          <p>
            Enquanto o pagamento não for aprovado, o pedido pode ser abandonado ou cancelado sem
            custo. Depois da aprovação, a produção começa e a peça passa a ser fabricada
            especificamente para o seu pedido, então o cancelamento antes da expedição depende do
            estágio da produção. Peça por e-mail o quanto antes, com o número do pedido.
          </p>
          <p>
            Se a peça já estiver produzida ou despachada, o caminho é o direito de arrependimento em
            7 dias após o recebimento.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Contato</p>
          <h2 id="contact-title">Canal de atendimento</h2>
        </div>
        <div className="legal-copy">
          <LegalSupplierIdentity />
          <p>
            Todas as solicitações desta página são recebidas por e-mail, com o número do pedido no
            assunto. As condições completas da compra estão em{" "}
            <Link href="/termos">condições de venda</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
