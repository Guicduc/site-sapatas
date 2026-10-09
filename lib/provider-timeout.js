// Limites de tempo para chamadas a provedores externos (Mercado Pago, Focus NFe,
// Melhor Envio). Sem timeout, um provedor lento segura a funcao serverless ate o
// limite da plataforma e pode estourar o lease da fila pos-pagamento.

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export function readTimeoutMs(envName, fallbackMs, { min = 100, max = 60_000 } = {}) {
  const raw = String(process.env[envName] ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) return fallbackMs;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function isTimeoutError(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError";
}

// Executa o fetch e le o corpo inteiro dentro do mesmo prazo. Devolve uma
// Response ja bufferizada, para que response.json()/text() dos chamadores nao
// fiquem pendurados depois do timeout. Timeout/abort vira um erro com `code`.
export async function fetchWithTimeout(url, init = {}, { timeoutMs, timeoutCode, timeoutMessage } = {}) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.arrayBuffer();
    return new Response(NULL_BODY_STATUSES.has(response.status) ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    if (!isTimeoutError(error)) throw error;
    const timeoutError = new Error(timeoutMessage || `Provider did not respond within ${timeoutMs}ms.`, { cause: error });
    timeoutError.code = timeoutCode || "provider_timeout";
    timeoutError.timeoutMs = timeoutMs;
    timeoutError.retryable = true;
    throw timeoutError;
  }
}
