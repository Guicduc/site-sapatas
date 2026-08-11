import Link from "next/link";

import { LegalSupplierIdentity } from "@/components/legal-supplier-identity";
import { brand } from "@/lib/site-data";

export const metadata = {
  title: "Condições de venda",
  description:
    "Condições gerais de venda da Baseforma: identificação do fornecedor, pedido, pagamento, prazos, nota fiscal, cancelamento e garantia.",
  alternates: {
    canonical: "/termos"
  }
};

const lastUpdated = "30 de julho de 2026";

export default function TermsPage() {
  return (
    <div className="legal-page">
      <section className="page-panel legal-hero">
        <p className="eyebrow">Condições de venda</p>
        <h1>Como funciona a compra na Baseforma</h1>
        <p>
          Este documento reúne as condições da venda a distância feita neste site: quem vende, o
          que é vendido, como o pedido é formado, como o pagamento é processado, quais prazos se
          aplicam e quais direitos você tem depois da compra.
        </p>
        <p className="legal-hero__updated">Atualizado em {lastUpdated}.</p>
      </section>

      <section className="page-panel legal-section" aria-labelledby="supplier-title">
        <div>
          <p className="eyebrow">Quem vende</p>
          <h2 id="supplier-title">Identificação do fornecedor</h2>
        </div>
        <div className="legal-copy">
          <LegalSupplierIdentity />
          <p>
            O atendimento é feito por e-mail. Use o mesmo endereço para dúvidas antes da compra,
            acompanhamento de pedido, troca, devolução ou reclamação.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="products-title">
        <div>
          <p className="eyebrow">O que é vendido</p>
          <h2 id="products-title">Produtos configurados sob demanda</h2>
        </div>
        <div className="legal-copy">
          <p>
            A Baseforma vende componentes técnicos para mobiliário, como sapatas e ponteiras,
            fabricados em TPU por impressão 3D. As peças são produzidas sob demanda a partir das
            medidas que você informa no configurador, dentro das faixas publicadas em cada família.
          </p>
          <p>
            Não há estoque de produto acabado: cada pedido é fabricado depois da aprovação do
            pagamento. Medidas fora da faixa publicada, geometrias inexistentes no catálogo ou
            aplicações com carga e tolerância críticas devem ser tratadas como{" "}
            <Link href="/projeto-especial">projeto especial</Link>, com avaliação técnica própria.
          </p>
          <p>
            As medidas informadas no configurador são de sua responsabilidade. O site valida se
            elas estão dentro da faixa aceita, mas não verifica se correspondem ao móvel ou ao tubo
            que receberá a peça. Em caso de dúvida na medição, fale com o atendimento antes de
            fechar o pedido.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="order-title">
        <div>
          <p className="eyebrow">Pedido</p>
          <h2 id="order-title">Formação e confirmação do pedido</h2>
        </div>
        <div className="legal-copy">
          <ol>
            <li>Você configura o item, escolhe a quantidade e adiciona ao carrinho.</li>
            <li>
              No carrinho informa nome, e-mail, contato, CPF ou CNPJ e endereço de entrega. O
              CPF/CNPJ é obrigatório porque a nota fiscal eletrônica exige o documento do
              destinatário.
            </li>
            <li>
              A Baseforma recalcula itens, cupom, frete e total no servidor antes de gravar o
              pedido. Se o valor recalculado divergir do exibido, vale o valor recalculado, e o
              pedido só segue com o total confirmado na tela.
            </li>
            <li>O pedido é criado no site e recebe um número próprio.</li>
            <li>Somente depois disso o pagamento é gerado.</li>
          </ol>
          <p>
            O contrato de compra se completa com a aprovação do pagamento. Até lá, o pedido existe
            como registro aguardando pagamento e pode ser abandonado sem custo.
          </p>
          <p>
            Você acompanha o pedido em <Link href="/conta">Minha conta</Link>, informando o e-mail
            usado na compra e o código enviado para esse endereço.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="prices-title">
        <div>
          <p className="eyebrow">Preço e pagamento</p>
          <h2 id="prices-title">Valores, meios de pagamento e nota fiscal</h2>
        </div>
        <div className="legal-copy">
          <p>
            Os preços são em reais, já incluem os tributos aplicáveis e não incluem o frete, que é
            calculado à parte no carrinho. Preços e prazos podem mudar a qualquer momento, mas a
            alteração não afeta pedidos já pagos.
          </p>
          <p>
            O pagamento é processado pelo Mercado Pago. Os meios disponíveis, o número de parcelas
            e eventuais acréscimos são os oferecidos por aquela plataforma no momento da compra. A
            Baseforma não recebe nem armazena os dados do seu cartão.
          </p>
          <p>
            Cupons de desconto valem conforme as regras informadas no próprio carrinho, incluindo
            valor mínimo e limite de desconto, e não são cumulativos entre si.
          </p>
          <p>
            A nota fiscal eletrônica é emitida automaticamente após a aprovação do pagamento, com
            os dados informados no pedido. Confira nome, CPF/CNPJ e endereço antes de finalizar:
            dados incorretos atrasam a emissão e podem exigir correção antes da expedição.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="delivery-title">
        <div>
          <p className="eyebrow">Prazos</p>
          <h2 id="delivery-title">Produção, frete e entrega</h2>
        </div>
        <div className="legal-copy">
          <p>
            O prazo total é a soma do prazo de produção com o prazo de transporte. A produção
            começa após a aprovação do pagamento e o prazo de produção aparece no produto
            configurado, variando conforme família, medida, quantidade e fila de produção.
          </p>
          <p>
            No lançamento, a postagem é feita pelos Correios com conferência da operação. O
            carrinho estima o frete a partir do CEP e dos itens configurados:
          </p>
          <ul>
            <li>São Paulo: R$ 18, com transporte estimado em 5 dias.</li>
            <li>Rio de Janeiro, Minas Gerais, Espírito Santo e Paraná: R$ 28, estimados em 7 dias.</li>
            <li>Santa Catarina e Rio Grande do Sul: R$ 28, estimados em 8 dias.</li>
            <li>Demais estados: R$ 42, estimados em 10 dias.</li>
            <li>Pedidos a partir de R$ 250 em produtos têm frete gratuito.</li>
          </ul>
          <p>
            Esses valores e prazos de transporte são estimativas comerciais e podem ser revisados
            pela operação antes da postagem, inclusive quando a embalagem, o endereço ou o serviço
            exigirem ajuste. Se a revisão alterar o valor já pago, a Baseforma comunica você por
            e-mail antes de despachar, e você pode cancelar o pedido sem custo caso não concorde.
          </p>
          <p>
            Quando o pedido é expedido, você recebe um e-mail com o registro da expedição e o
            código de rastreio, se houver. Atrasos causados pela transportadora, endereço
            incorreto ou ausência no recebimento não estão sob controle da Baseforma, mas o
            atendimento ajuda a localizar o pacote.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="cancel-title">
        <div>
          <p className="eyebrow">Depois da compra</p>
          <h2 id="cancel-title">Cancelamento, arrependimento e garantia</h2>
        </div>
        <div className="legal-copy">
          <p>
            Você pode cancelar o pedido sem custo enquanto o pagamento não tiver sido aprovado.
            Depois da aprovação, o cancelamento antes da expedição depende do estágio da produção,
            já que a peça é fabricada especificamente para o seu pedido; peça o cancelamento por
            e-mail o quanto antes, informando o número do pedido.
          </p>
          <p>
            Como esta é uma compra feita fora de estabelecimento comercial, você tem direito de
            arrependimento em até 7 dias corridos contados do recebimento, conforme o art. 49 do
            Código de Defesa do Consumidor, mesmo em itens configurados sob medida.
          </p>
          <p>
            A garantia legal contra vício do produto é de 90 dias contados do recebimento, conforme
            o art. 26, II do Código de Defesa do Consumidor.
          </p>
          <p>
            Os prazos, os procedimentos e a forma de reembolso estão detalhados na página de{" "}
            <Link href="/trocas">trocas e devoluções</Link>.
          </p>
        </div>
      </section>

      <section className="page-panel legal-section" aria-labelledby="general-title">
        <div>
          <p className="eyebrow">Gerais</p>
          <h2 id="general-title">Dados, legislação e atualizações</h2>
        </div>
        <div className="legal-copy">
          <p>
            O tratamento de dados pessoais e o uso de cookies estão descritos em{" "}
            <Link href="/privacidade">privacidade e cookies</Link>. Os dados informados no checkout
            são usados para produzir, faturar, entregar e dar suporte ao pedido.
          </p>
          <p>
            Estas condições são regidas pela legislação brasileira, em especial a Lei 8.078/1990
            (Código de Defesa do Consumidor) e o Decreto 7.962/2013.
          </p>
          <p>
            A Baseforma pode atualizar este documento para refletir mudanças na operação. A versão
            aplicável a um pedido é a que estava publicada quando ele foi feito, e a data de
            atualização aparece no topo desta página.
          </p>
          <p>
            Dúvidas sobre estas condições:{" "}
            <a href={`mailto:${brand.email}?subject=Condições de venda`}>{brand.email}</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
