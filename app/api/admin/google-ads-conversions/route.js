import { assertAdminRequest } from "@/lib/admin-api-auth";
import { buildGoogleAdsOfflineConversionsCsv, DEFAULT_OFFLINE_CONVERSION_NAME } from "@/lib/campaign-report";
import { listOrders } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV de conversoes offline por clique (gclid) para Google Ads > Metas > Conversoes >
// Uploads. Cobre as compras aprovadas fora do navegador (Pix/boleto). Ver
// docs/marketing/paid-traffic-launch.md.
export async function GET(request) {
  try {
    await assertAdminRequest(request);
  } catch {
    return new Response("Acesso administrativo necessário.", {
      status: 401,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const url = new URL(request.url);
  const days = clampDays(url.searchParams.get("dias"));
  const conversionName = url.searchParams.get("conversao") || DEFAULT_OFFLINE_CONVERSION_NAME;
  const orders = await listOrders({ limit: 500 });
  const { csv } = buildGoogleAdsOfflineConversionsCsv(orders, { days, conversionName });
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="google-ads-conversoes-${stamp}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}

function clampDays(value) {
  const days = Math.round(Number(value) || 90);
  return Math.min(90, Math.max(1, days));
}
