import { hasMercadoPagoInvoiceEndpoint } from "@/lib/invoice-provider";
import { getMercadoPagoEnvironment, hasMercadoPagoCredentials } from "@/lib/mercado-pago";
import { getInvoiceConfig, INVOICE_PROVIDERS, isAutomatedInvoiceProvider, isSupportedInvoiceProvider } from "@/lib/invoice-config";
import { checkOrderStoreHealth } from "@/lib/order-store";
import { hasRealShippingProvider } from "@/lib/shipping";
import { hasTransactionalEmailProvider } from "@/lib/transactional-email";

export async function getIntegrationHealth() {
  const checks = [
    await checkDatabase(),
    checkMercadoPago(),
    checkShipping(),
    checkEmail(),
    checkSessions(),
    checkInvoice()
  ];
  const required = checks.filter((check) => check.required);

  return {
    ok: required.every((check) => check.ok),
    generatedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    checks
  };
}

async function checkDatabase() {
  try {
    const health = await checkOrderStoreHealth();
    const productionWithoutDatabase = process.env.NODE_ENV === "production" && health.mode !== "postgres";

    return {
      id: "database",
      label: "Banco de pedidos",
      ok: !productionWithoutDatabase,
      required: true,
      mode: health.mode,
      message: productionWithoutDatabase
        ? "DATABASE_URL precisa estar configurada em producao."
        : health.mode === "postgres"
          ? "Postgres acessivel e schema preparado."
          : "Usando armazenamento local de desenvolvimento."
    };
  } catch (error) {
    return {
      id: "database",
      label: "Banco de pedidos",
      ok: false,
      required: true,
      mode: process.env.DATABASE_URL ? "postgres" : "local",
      message: error.message || "Falha ao verificar banco de pedidos."
    };
  }
}

function checkMercadoPago() {
  const hasSiteUrl = Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL);
  const requiresWebhookSecret = process.env.NODE_ENV === "production";
  const webhookSecretOk = !requiresWebhookSecret || Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET);
  const ok = hasMercadoPagoCredentials() && hasSiteUrl && webhookSecretOk;

  return {
    id: "mercado_pago",
    label: "Mercado Pago",
    ok,
    required: true,
    mode: getMercadoPagoEnvironment(),
    message: ok
      ? "Credenciais e callbacks basicos configurados."
      : [
          !hasMercadoPagoCredentials() ? "MERCADO_PAGO_ACCESS_TOKEN ausente." : "",
          !hasSiteUrl ? "NEXT_PUBLIC_SITE_URL ou VERCEL_URL ausente." : "",
          !webhookSecretOk ? "MERCADO_PAGO_WEBHOOK_SECRET obrigatorio em producao." : ""
        ].filter(Boolean).join(" ")
  };
}

function checkShipping() {
  const provider = String(process.env.SHIPPING_PROVIDER || "manual").trim().toLowerCase();
  const realProvider = hasRealShippingProvider();
  const configured = Boolean(process.env.MELHOR_ENVIO_ACCESS_TOKEN && process.env.SHIPPING_ORIGIN_POSTAL_CODE);
  const ok = !realProvider || configured;

  return {
    id: "shipping",
    label: "Frete",
    ok,
    required: false,
    mode: provider,
    message: ok
      ? realProvider
        ? "Melhor Envio configurado para cotacao real; postagem continua manual."
        : "Frete manual/fallback ativo."
      : "Para Melhor Envio, configure MELHOR_ENVIO_ACCESS_TOKEN e SHIPPING_ORIGIN_POSTAL_CODE."
  };
}

function checkEmail() {
  const ok = hasTransactionalEmailProvider();

  return {
    id: "email",
    label: "E-mails transacionais",
    ok,
    required: process.env.NODE_ENV === "production",
    mode: ok ? "resend" : "disabled",
    message: ok
      ? "Resend configurado."
      : "Configure RESEND_API_KEY e remetente para envio de codigos e avisos."
  };
}

function checkSessions() {
  const adminOk = Boolean(process.env.ADMIN_ACCESS_TOKEN);
  const adminSecretOk = Boolean(process.env.ADMIN_SESSION_SECRET || process.env.ACCOUNT_SESSION_SECRET);
  const accountSecretOk = Boolean(process.env.ACCOUNT_SESSION_SECRET);
  const ok = process.env.NODE_ENV !== "production" || (adminOk && adminSecretOk && accountSecretOk);

  return {
    id: "sessions",
    label: "Sessoes e admin",
    ok,
    required: true,
    mode: "http_only_cookies",
    message: ok
      ? "Segredos de sessao suficientes para o ambiente atual."
      : "Em producao, configure ADMIN_ACCESS_TOKEN, ADMIN_SESSION_SECRET e ACCOUNT_SESSION_SECRET."
  };
}

function checkInvoice() {
  const config = getInvoiceConfig();
  const supported = isSupportedInvoiceProvider(config.provider);
  const automated = isAutomatedInvoiceProvider(config.provider);
  const endpointConfigured = hasMercadoPagoInvoiceEndpoint();
  const fiscalConfigOk = config.documentModel === "nfe" && config.environment === "production";
  const ok = supported && (automated
    ? hasMercadoPagoCredentials() && endpointConfigured
    : fiscalConfigOk);

  return {
    id: "invoice",
    label: "Nota fiscal",
    ok,
    required: false,
    mode: config.provider,
    message: !supported
      ? "Fornecedor fiscal nao suportado."
      : automated
        ? ok
          ? "Emissao fiscal automatica via API Mercado Pago configurada."
          : "Provider de API fiscal ativo; configure MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_INVOICE_API_URL quando o endpoint fiscal estiver liberado."
        : config.provider === INVOICE_PROVIDERS.MERCADO_PAGO_SYSTEM
          ? ok
            ? "NF-e em producao via Sistema de Gestao Mercado Pago; emissao operacional fora da API do site."
            : "Configuracao fiscal incompleta para o Sistema de Gestao Mercado Pago."
          : ok
            ? "Emissao fiscal externa permanece manual, conforme contrato operacional atual."
            : "Configuracao fiscal manual incompleta."
  };
}
