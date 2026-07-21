import {
  getFocusNfeBaseUrl,
  normalizeFocusNfeEnvironment
} from "../lib/focus-nfe.js";

const issuerCnpj = onlyDigits(process.env.INVOICE_ISSUER_CNPJ || "42616830000198");
const rawEnvironment = cleanText(process.env.FOCUS_NFE_ENV);
const environment = normalizeFocusNfeEnvironment(rawEnvironment);
const token = cleanText(process.env.FOCUS_NFE_TOKEN);
const webhookToken = cleanText(process.env.FOCUS_NFE_WEBHOOK_TOKEN);
const siteUrl = cleanText(process.env.NEXT_PUBLIC_SITE_URL || "https://www.baseforma.com.br").replace(/\/$/, "");
const expectedWebhookUrl = `${siteUrl}/api/webhooks/focus-nfe`;
const checks = [];

const providerOk = cleanText(process.env.INVOICE_PROVIDER).toLowerCase() === "focus_nfe";
const environmentOk = Boolean(rawEnvironment && environment);
const issuerCnpjOk = issuerCnpj.length === 14;

check("provider", providerOk, providerOk ? "Provider Focus NFe ativo." : "INVOICE_PROVIDER deve ser focus_nfe.");
check("environment", environmentOk, environmentOk ? `Ambiente ${environment} selecionado.` : "FOCUS_NFE_ENV deve ser homologacao ou producao.");
check("issuer_cnpj", issuerCnpjOk, issuerCnpjOk ? "CNPJ emitente tem 14 digitos." : "INVOICE_ISSUER_CNPJ deve ter 14 digitos.");
check("api_token", Boolean(token), token ? "Token da API presente." : "FOCUS_NFE_TOKEN esta ausente ou vazio.");
check("webhook_token", Boolean(webhookToken), webhookToken ? "Segredo do webhook presente." : "FOCUS_NFE_WEBHOOK_TOKEN esta ausente ou vazio.");

if (checks.some((item) => !item.ok)) {
  finish();
} else {
  const baseUrl = getFocusNfeBaseUrl(environment);
  const auth = `Basic ${Buffer.from(`${token}:`).toString("base64")}`;

  try {
    const companies = await requestJson(`${baseUrl}/v2/empresas?cnpj=${issuerCnpj}`, auth);
    check("companies_api", companies.ok, companies.message);

    if (companies.ok) {
      const company = findCompany(companies.data, issuerCnpj);
      check("issuer_registered", Boolean(company), company
        ? "CNPJ emitente encontrado no ambiente selecionado."
        : "CNPJ emitente nao foi encontrado no ambiente selecionado.");

      if (company) {
        const nfeEnabled = firstDefined(company.habilita_nfe, company.nfe_habilitada, company.emite_nfe);
        check("nfe_enabled", typeof nfeEnabled === "boolean" ? nfeEnabled : null,
          typeof nfeEnabled !== "boolean"
            ? "A API nao expos o indicador de habilitacao; confirme NF-e no painel."
            : nfeEnabled
              ? "Empresa habilitada para NF-e."
              : "A empresa esta desabilitada para NF-e na Focus NFe.");
        const certificateExpiry = findCertificateExpiry(company);
        const certificateValid = getCertificateValidity(certificateExpiry);
        check(
          "certificate",
          certificateValid,
          certificateValid !== null
            ? certificateValid
              ? `Certificado informado pela API com validade ate ${certificateExpiry}.`
              : `Certificado informado pela API expirou em ${certificateExpiry}.`
            : "A API nao expos a validade do certificado; confirme o A1 no painel e numa emissao de homologacao."
        );
      }
    }

    const hooks = await requestJson(`${baseUrl}/v2/hooks`, auth);
    check("hooks_api", hooks.ok, hooks.message);

    if (hooks.ok) {
      const hook = toArray(hooks.data).find((item) => (
        cleanText(item?.event).toLowerCase() === "nfe"
        && normalizeUrl(item?.url) === normalizeUrl(expectedWebhookUrl)
      ));
      check("webhook_registered", Boolean(hook), hook
        ? `Gancho nfe encontrado em ${expectedWebhookUrl}.`
        : `Gancho nfe esperado em ${expectedWebhookUrl}.`);

      if (hook) {
        const hookAuthorization = cleanText(hook.authorization);
        check("webhook_authorization", hookAuthorization
          ? hookAuthorization === webhookToken
          : null, hookAuthorization
          ? hookAuthorization === webhookToken
            ? "Segredo authorization do gancho confere."
            : "O segredo authorization do gancho nao coincide com FOCUS_NFE_WEBHOOK_TOKEN."
          : "A API nao devolveu o segredo do gancho; confirme-o no painel ou recrie o gancho.");
        const header = cleanText(hook.authorization_header || "Authorization").toLowerCase();
        check(
          "webhook_header",
          header === "authorization",
          header === "authorization"
            ? "Gancho envia o segredo no header Authorization."
            : "O gancho deve enviar o segredo no header Authorization."
        );
      }
    }
  } catch (error) {
    check("network", false, error.message || "Falha de rede ao consultar a Focus NFe.");
  }

  finish();
}

async function requestJson(url, authorization) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: authorization
    },
    signal: AbortSignal.timeout(15_000)
  });
  let data = null;

  try {
    data = await response.json();
  } catch {
    // A auditoria nunca imprime o corpo bruto, que pode conter dados fiscais.
  }

  return {
    ok: response.ok,
    data,
    message: response.ok
      ? `API respondeu HTTP ${response.status}.`
      : `API respondeu HTTP ${response.status}; confirme token e ambiente.`
  };
}

function findCompany(data, cnpj) {
  return toArray(data).find((item) => onlyDigits(item?.cnpj || item?.cpf_cnpj) === cnpj) || null;
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.empresas)) return data.empresas;
  if (Array.isArray(data?.hooks)) return data.hooks;
  return data && typeof data === "object" ? [data] : [];
}

function findCertificateExpiry(company) {
  return cleanText(
    company?.certificado_valido_ate
    || company?.validade_certificado
    || company?.data_validade_certificado
  );
}

function getCertificateValidity(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp >= Date.now() : null;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function check(id, ok, message) {
  checks.push({ id, ok, message });
}

function finish() {
  const failed = checks.filter((item) => item.ok === false);
  const manual = checks.filter((item) => item.ok === null);
  const report = {
    ok: failed.length === 0 && manual.length === 0,
    environment: rawEnvironment ? environment || "invalid" : "missing",
    checks,
    summary: {
      passed: checks.filter((item) => item.ok === true).length,
      failed: failed.length,
      manual: manual.length
    }
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failed.length) process.exitCode = 1;
}

function normalizeUrl(value) {
  return cleanText(value).replace(/\/$/, "").toLowerCase();
}

function onlyDigits(value) {
  return cleanText(value).replace(/\D/g, "");
}

function cleanText(value) {
  return String(value || "").trim();
}
