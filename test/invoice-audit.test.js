import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const auditPath = fileURLToPath(new URL("../scripts/audit-focus-nfe.mjs", import.meta.url));
const mockedFetch = `
  globalThis.fetch = async (url) => Response.json(
    String(url).includes('/v2/empresas')
      ? [{ cnpj: '42616830000198', habilita_nfe: true, certificado_valido_ate: '2099-01-01' }]
      : [{ event: 'nfe', url: 'https://example.test/api/webhooks/focus-nfe',
           authorization: 'audit-webhook', authorization_header: 'Authorization' }]
  );
`;

function runAudit(overrides = {}) {
  const result = spawnSync(process.execPath, [
    "--import", `data:text/javascript,${encodeURIComponent(mockedFetch)}`, auditPath
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      INVOICE_PROVIDER: "focus_nfe",
      INVOICE_AUTOMATION_ENABLED: "false",
      INVOICE_ISSUER_CNPJ: "42616830000198",
      FOCUS_NFE_ENV: "homologacao",
      FOCUS_NFE_TOKEN: "audit-token",
      FOCUS_NFE_WEBHOOK_TOKEN: "audit-webhook",
      NEXT_PUBLIC_SITE_URL: "https://example.test",
      ...overrides
    }
  });
  assert.ifError(result.error);
  return { status: result.status, report: JSON.parse(result.stdout) };
}

test("audita certificado e webhook com a automacao pausada", () => {
  const { status, report } = runAudit();
  assert.equal(status, 0);
  assert.equal(report.checks.find((check) => check.id === "automation_enabled").ok, null);
  assert.equal(report.checks.find((check) => check.id === "certificate").ok, true);
  assert.equal(report.checks.find((check) => check.id === "webhook_registered").ok, true);
  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.manual, 1);
});

test("credencial ausente ainda impede consultas fiscais", () => {
  const { status, report } = runAudit({ FOCUS_NFE_TOKEN: "" });
  assert.equal(status, 1);
  assert.equal(report.checks.find((check) => check.id === "api_token").ok, false);
  assert.equal(report.checks.some((check) => check.id === "companies_api"), false);
});
