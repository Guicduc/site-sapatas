import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { brand } from "@/lib/site-data";

export const metadata = {
  title: "Privacidade e cookies",
  description: "Tecnologias de armazenamento usadas pela Baseforma e como revisar suas preferências."
};

const storageItems = [
  {
    name: "baseforma-admin",
    type: "Cookie HttpOnly",
    purpose: "Mantém a sessão da área administrativa depois do acesso autorizado.",
    duration: "12 horas"
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
  }
];

export default function PrivacyPage() {
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

      <section className="page-panel privacy-section" aria-labelledby="choices-title">
        <div>
          <p className="eyebrow">Sua escolha</p>
          <h2 id="choices-title">Como revisar as preferências</h2>
        </div>
        <div className="privacy-copy">
          <p>
            Use “Preferências de cookies” no rodapé a qualquer momento. A opção “Recusar
            opcionais” mantém apenas as tecnologias necessárias listadas acima. A escolha expira
            em 180 dias para que o site possa apresentá-la novamente.
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
            Links para WhatsApp e o checkout do Mercado Pago só abrem quando você escolhe essas
            ações. As respectivas plataformas passam a aplicar suas próprias políticas quando
            você as acessa.
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
