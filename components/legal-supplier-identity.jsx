import { getInvoiceConfig } from "@/lib/invoice-config";
import { company } from "@/lib/site-data";

// Identificacao do fornecedor exigida pelo art. 2, I do Decreto 7.962/2013.
// Campos ainda nao confirmados pela operacao (razao social, endereco) sao omitidos
// em vez de exibidos vazios; complete-os em lib/site-data.js.
export function LegalSupplierIdentity() {
  const cnpj = formatCnpj(getInvoiceConfig().issuerCnpj);
  const location = [company.city, company.state].filter(Boolean).join(" - ");

  return (
    <dl>
      <dt>Nome</dt>
      <dd>{company.tradeName}</dd>

      {company.legalName ? (
        <>
          <dt>Razão social</dt>
          <dd>{company.legalName}</dd>
        </>
      ) : null}

      <dt>CNPJ</dt>
      <dd>{cnpj}</dd>

      {company.address ? (
        <>
          <dt>Endereço</dt>
          <dd>{company.address}</dd>
        </>
      ) : null}

      {location ? (
        <>
          <dt>Localidade</dt>
          <dd>
            {location}
            {company.country ? `, ${company.country}` : ""}
          </dd>
        </>
      ) : null}

      <dt>Atendimento</dt>
      <dd>
        <a href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a>
      </dd>
    </dl>
  );
}

function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 14) return "Não informado";

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
