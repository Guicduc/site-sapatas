import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { ADS_COOKIE_DURATION_LABEL, getConfiguredAdsTags } from "@/lib/ads-config";
import { brand } from "@/lib/site-data";
import {
  ANALYTICS_COOKIE_DURATION_LABEL,
  getAnalyticsCookieNames,
  getConfiguredMeasurementId
} from "@/lib/analytics-config";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "Privacidade e cookies",
  description:
    "Tecnologias de armazenamento usadas pela Baseforma e como revisar suas preferências.",
  path: "/privacidade"
});

const storageItems = [
  {
    name: "baseforma-admin",
    type: "Cookie HttpOnly",
    purpose: "Mantém a sessão da área administrativa depois do acesso autorizado.",
    duration: "180 dias, renovados com o uso"
  },
  {
    name: "baseforma-account",
    type: "Cookie HttpOnly",
    purpose: "Mantém a sessão da conta do cliente depois da confirmação por e-mail.",
    duration: "30 dias"
  },
  {
    name: "baseforma-order-access",
    type: "Cookie HttpOnly",
    purpose: "Libera temporariamente o pedido que acabou de ser criado neste navegador.",
    duration: "2 horas"
  },
  {
    name: "baseforma-cart",
    type: "Armazenamento local",
    purpose: "Mantém os itens configurados no carrinho entre visitas.",
    duration: "Até a limpeza do navegador"
  },
  {
    name: "baseforma-cart-recovery",
    type: "Armazenamento local",
    purpose: "Guarda o identificador e o token de um carrinho salvo para retomada.",
    duration: "Até a conversão ou limpeza do navegador"
  },
  {
    name: "baseforma-last-order-id",
    type: "Armazenamento da sessão",
    purpose: "Ajuda a reabrir a confirmação do último pedido nesta aba.",
    duration: "Até fechar a aba"
  },
  {
    name: "baseforma-cookie-consent",
    type: "Armazenamento local",
    purpose: "Registra a escolha de cookies e quando ela deve ser solicitada novamente.",
    duration: "180 dias"
  },
  {
    name: "baseforma-attribution",
    type: "Armazenamento local",
    purpose: "Guarda a campanha (parâmetros utm), a página de entrada e o site de origem da visita para registrar no pedido. Não identifica o visitante.",
    duration: "30 dias"
  }
];

function getOptionalItems(measurementId) {
  if (!measurementId) return [];
  const [clientCookie, sessionCookie] = getAnalyticsCookieNames(measurementId);

  return [
    {
      name: clientCookie,
      type: "Cookie do Google Analytics 4 (Google)",
      purpose: "Distingue visitantes de forma pseudônima para medir visitas e compras agregadas.",
      duration: ANALYTICS_COOKIE_DURATION_LABEL
    },
    {
      name: sessionCookie,
      type: "Cookie do Google Analytics 4 (Google)",
      purpose: "Mantém o estado da sessão de medição do Google Analytics 4.",
      duration: ANALYTICS_COOKIE_DURATION_LABEL
    },
    {
      name: "baseforma-analytics-purchases",
      type: "Armazenamento local",
      purpose: "Guarda os números de pedido já medidos para não contar a mesma compra duas vezes.",
      duration: "Até revogar a escolha ou limpar o navegador"
    }
  ];
}

function getAdsItems(tags) {
  const items = [];

  if (tags.googleAdsId) {
    items.push({
      name: "_gcl_au, _gcl_aw, _gcl_gb",
      type: "Cookie do Google Ads (Google)",
      purpose: "Liga o clique em um anúncio do Google à visita e à compra, para medir o resultado da campanha.",
      duration: ADS_COOKIE_DURATION_LABEL
    });
  }

  if (tags.metaPixelId) {
    items.push(
      {
        name: "_fbp",
        type: "Cookie do Meta Pixel (Meta)",
        purpose: "Identificador pseudônimo do navegador para medir anúncios do Facebook e Instagram e formar públicos de quem visitou o site.",
        duration: ADS_COOKIE_DURATION_LABEL
      },
      {
        name: "_fbc",
        type: "Cookie do Meta Pixel (Meta)",
        purpose: "Guarda o clique em um anúncio do Facebook ou Instagram para atribuir a compra à campanha.",
        duration: ADS_COOKIE_DURATION_LABEL
      }
    );
  }

  if (items.length > 0) {
    items.push({
      name: "baseforma-ad-clicks",
      type: "Armazenamento local",
      purpose: "Guarda o identificador do clique no anúncio (gclid/fbclid) para registrar no pedido de qual anúncio veio a compra, inclusive quando o Pix é aprovado depois.",
      duration: "90 dias ou até revogar a escolha"
    });
    items.push({
      name: "baseforma-ads-purchases",
      type: "Armazenamento local",
      purpose: "Guarda os números de pedido já informados às plataformas de anúncio para não contar a mesma compra duas vezes.",
      duration: "Até revogar a escolha ou limpar o navegador"
    });
  }

  return items;
}

export default function PrivacyPage() {
  const measurementId = getConfiguredMeasurementId();
  const adsTags = getConfiguredAdsTags();
  const adsItems = getAdsItems(adsTags);
  const adsVendors = [adsTags.googleAdsId && "Google Ads (Google)", adsTags.metaPixelId && "Meta Pixel (Meta, Facebook e Instagram)"]
    .filter(Boolean)
    .join(" e ");
  const optionalItems = [...getOptionalItems(measurementId), ...adsItems];

  return (
    <div className="privacy-page">
      <section className="page-panel privacy-hero">
        <p className="eyebrow">Privacidade</p>
        <h1>Cookies e tecnologias semelhantes</h1>
        <p>
          Esta página explica o que o site usa hoje, para qual função e por quanto tempo. Ela
          descreve a implementação técnica atual e pode ser atualizada quando o site mudar.
        </p>
        <CookiePreferencesButton />
      </section>

      {adsItems.length > 0 && (
        <section className="page-panel privacy-section" aria-labelledby="ads-use-title">
          <div>
            <p className="eyebrow">Estado atual</p>
            <h2 id="ads-use-title">Publicidade opcional</h2>
          </div>
          <div className="privacy-copy">
            <p>
              A Baseforma anuncia no Google e nas redes da Meta. Com a sua permissão na categoria
              “Publicidade”, usamos {adsVendors} para saber quais anúncios trouxeram visitas e
              compras e para mostrar anúncios a quem já visitou o site. Essas tags só são
              carregadas depois do aceite dessa categoria, separada da medição de audiência.
            </p>
            <p>
              Enviamos às plataformas a página visitada (os identificadores de pagamento do
              retorno do checkout são removidos do endereço antes), os produtos vistos ou
              adicionados ao carrinho e o valor e o número público do pedido quando a compra é
              aprovada. Nome, e-mail, CPF/CNPJ, telefone e endereço não são enviados, e a
              correspondência avançada de dados está desligada. A área do cliente, a área
              administrativa e o modo demonstração não carregam essas tags.
            </p>
            <p>
              Ao revogar a escolha no rodapé, as tags param de enviar dados nesta navegação e os
              cookies de publicidade deste site são apagados. Google e Meta tratam os dados
              recebidos conforme as próprias políticas de privacidade, inclusive com possível
              transferência internacional.
            </p>
          </div>
        </section>
      )}

      {measurementId ? (
        <section className="page-panel privacy-section" aria-labelledby="current-use-title">
          <div>
            <p className="eyebrow">Estado atual</p>
            <h2 id="current-use-title">
              {adsItems.length > 0 ? "Medição de audiência opcional" : "Medição de audiência opcional, sem publicidade"}
            </h2>
          </div>
          <div className="privacy-copy">
            <p>
              Com a sua permissão, usamos o Google Analytics 4, do Google, para entender de
              forma agregada quais páginas são visitadas e como o carrinho e as compras
              evoluem. O script só é carregado depois de você aceitar os opcionais; quem recusa
              não envia nenhuma medição.
            </p>
            <p>
              {adsItems.length > 0
                ? "O Google Analytics não usa Google Signals nem compartilha dados para anúncios; a publicidade tem tags e aceite próprios, descritos acima."
                : "Não usamos anúncios, pixels de publicidade, Google Signals nem compartilhamento de dados para anúncios."}{" "}
              Nome, e-mail, CPF/CNPJ, telefone e endereço não são enviados ao Google, e
              parâmetros de endereço das páginas que possam identificar pedidos ou acessos são
              removidos antes do envio. A área administrativa e o modo demonstração não são
              medidos.
            </p>
            <p>
              Ao revogar a escolha no rodapé, a medição é interrompida nesta navegação e os
              cookies do Google Analytics são apagados. O Google trata esses dados conforme a
              própria política de privacidade, inclusive com possível transferência
              internacional.
            </p>
          </div>
        </section>
      ) : adsItems.length === 0 && (
        <section className="page-panel privacy-section" aria-labelledby="current-use-title">
          <div>
            <p className="eyebrow">Estado atual</p>
            <h2 id="current-use-title">Sem publicidade ou medição de audiência</h2>
          </div>
          <div className="privacy-copy">
            <p>
              Não encontramos scripts de anúncios, pixels, analytics, vídeos incorporados ou
              ferramentas de mapa de calor na aplicação atual. O JSON-LD usado para dados
              estruturados é estático e não armazena informações no navegador.
            </p>
            <p>
              Por isso, recusar opcionais não remove nenhuma função do site, e aceitar também não
              inicia uma coleta adicional hoje. Uma futura ferramenta opcional exigirá inventário
              atualizado e uma nova escolha antes de carregar.
            </p>
          </div>
        </section>
      )}

      <section className="page-panel privacy-section" aria-labelledby="inventory-title">
        <div>
          <p className="eyebrow">Inventário verificável</p>
          <h2 id="inventory-title">Tecnologias necessárias</h2>
        </div>
        <div className="privacy-table-wrap">
          <table className="privacy-table">
            <caption className="sr-only">Cookies e armazenamentos usados pela Baseforma</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Tipo</th>
                <th scope="col">Finalidade</th>
                <th scope="col">Duração</th>
              </tr>
            </thead>
            <tbody>
              {storageItems.map((item) => (
                <tr key={item.name}>
                  <th scope="row"><code>{item.name}</code></th>
                  <td>{item.type}</td>
                  <td>{item.purpose}</td>
                  <td>{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {optionalItems.length > 0 && (
        <section className="page-panel privacy-section" aria-labelledby="optional-inventory-title">
          <div>
            <p className="eyebrow">Inventário verificável</p>
            <h2 id="optional-inventory-title">Tecnologias opcionais</h2>
          </div>
          <div className="privacy-table-wrap">
            <table className="privacy-table">
              <caption className="sr-only">
                Cookies e armazenamentos opcionais, criados somente após o aceite
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Finalidade</th>
                  <th scope="col">Duração</th>
                </tr>
              </thead>
              <tbody>
                {optionalItems.map((item) => (
                  <tr key={item.name}>
                    <th scope="row"><code>{item.name}</code></th>
                    <td>{item.type}</td>
                    <td>{item.purpose}</td>
                    <td>{item.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="page-panel privacy-section" aria-labelledby="attribution-title">
        <div>
          <p className="eyebrow">Pedidos</p>
          <h2 id="attribution-title">Origem da visita registrada no pedido</h2>
        </div>
        <div className="privacy-copy">
          <p>
            Para saber quais campanhas e canais trazem vendas, o pedido guarda a origem da visita:
            os parâmetros de campanha do link (utm), a página de entrada e o site de origem. Essa
            informação não identifica quem visitou; ela passa a fazer parte do pedido apenas
            quando você compra, com base no legítimo interesse de medir o resultado das
            campanhas da Baseforma.
          </p>
          <p>
            Com a categoria “Publicidade” aceita, o pedido também guarda o identificador do clique
            no anúncio do Google ou da Meta, usado para informar ao Google Ads compras aprovadas
            depois (por exemplo, Pix), sem nome, e-mail, documento ou endereço. Com a “Medição”
            aceita, guarda o identificador pseudônimo do Google Analytics. Recusar essas
            categorias impede esses registros.
          </p>
        </div>
      </section>

      <section className="page-panel privacy-section" aria-labelledby="choices-title">
        <div>
          <p className="eyebrow">Sua escolha</p>
          <h2 id="choices-title">Como revisar as preferências</h2>
        </div>
        <div className="privacy-copy">
          <p>
            Use “Preferências de cookies” no rodapé a qualquer momento. A opção “Recusar
            opcionais” mantém apenas as tecnologias necessárias listadas acima
            {adsItems.length > 0
              ? "; “Escolher por finalidade” permite aceitar a medição e a publicidade separadamente"
              : ""}
            . A escolha expira em 180 dias para que o site possa apresentá-la novamente.
          </p>
          <p>
            Apagar os dados deste site nas configurações do navegador também remove o carrinho e
            a preferência salva. Cookies HttpOnly de sessão podem ser encerrados pelo logout ou
            pelo fim do prazo indicado.
          </p>
        </div>
      </section>

      <section className="page-panel privacy-section" aria-labelledby="services-title">
        <div>
          <p className="eyebrow">Serviços externos</p>
          <h2 id="services-title">Integrações não são scripts de rastreamento</h2>
        </div>
        <div className="privacy-copy">
          <p>
            O servidor pode consultar ViaCEP, Mercado Pago, Melhor Envio, Focus NFe e Resend para
            executar endereço, pagamento, frete, nota fiscal e e-mails. Esses serviços não são
            carregados como pixels ou scripts de publicidade nas páginas.
          </p>
          <p>
            O checkout do Mercado Pago só abre quando você escolhe pagar. A partir daí, aquela
            plataforma passa a aplicar as próprias políticas. Os demais contatos do site usam
            e-mail, sem script de terceiros carregado na página.
          </p>
        </div>
      </section>

      <section className="page-panel privacy-section" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Contato</p>
          <h2 id="contact-title">Dúvidas ou solicitações sobre dados</h2>
        </div>
        <div className="privacy-copy">
          <p>
            Para pedir acesso, correção ou exclusão de dados, entre em contato pelo canal oficial.
            A resposta dependerá dos dados envolvidos e das obrigações aplicáveis à operação.
          </p>
          <a href={`mailto:${brand.email}?subject=Privacidade e dados pessoais`}>{brand.email}</a>
        </div>
      </section>
    </div>
  );
}
