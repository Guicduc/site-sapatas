const poolStateKey = Symbol.for("baseforma.postgres.pool");

function getPoolState() {
  if (!globalThis[poolStateKey]) {
    globalThis[poolStateKey] = { pool: null, connectionKey: "", creating: null };
  }
  return globalThis[poolStateKey];
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabaseMode() {
  if (process.env.NODE_ENV === "production" && !hasDatabaseUrl()) {
    throw new Error("DATABASE_URL precisa estar configurada em produção.");
  }
  return hasDatabaseUrl() ? "postgres" : "local";
}

export async function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const error = new Error("DATABASE_URL não está configurada.");
    error.code = "missing_database_url";
    throw error;
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  // Verifica o certificado por padrao (Neon usa CA publica). Opt-out explicito
  // com DATABASE_SSL_REJECT_UNAUTHORIZED=false para provedores com CA propria.
  const ssl = process.env.DATABASE_SSL === "false" || isLocal
    ? false
    : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" };
  const connectionKey = `${connectionString}|ssl:${ssl ? `verify=${ssl.rejectUnauthorized}` : "off"}`;
  const state = getPoolState();

  if (state.pool && state.connectionKey === connectionKey) return state.pool;
  if (state.creating && state.connectionKey === connectionKey) return state.creating;
  if (state.creating) await state.creating;

  if (state.pool && state.connectionKey === connectionKey) return state.pool;

  if (state.pool) {
    await state.pool.end();
    state.pool = null;
  }

  state.connectionKey = connectionKey;
  state.creating = import("pg").then(({ Pool }) => {
    const pool = new Pool({ connectionString, ssl, ...getPoolTimeouts() });
    // Sem este handler, um erro em conexao ociosa (ex.: Neon suspendendo o
    // compute) vira 'error' nao tratado e derruba o processo Node.
    pool.on("error", (error) => {
      console.error("[db] erro em conexao ociosa do pool", { code: error?.code, message: error?.message });
    });
    state.pool = pool;
    state.creating = null;
    return pool;
  }).catch((error) => {
    state.creating = null;
    state.connectionKey = "";
    throw error;
  });

  return state.creating;
}

export async function query(text, values = []) {
  const pool = await getPool();
  return pool.query(text, values);
}

export async function withTransaction(operation) {
  const pool = await getPool();
  const client = await pool.connect();
  let releaseError;
  // Conexao em uso fica sem listener de 'error' no pg-pool; se o servidor a
  // encerrar (ex.: idle_in_transaction_session_timeout), o evento derrubaria o
  // processo. Registra o erro e descarta a conexao no release.
  const onClientError = (error) => {
    releaseError = releaseError || error;
    console.error("[db] conexao em transacao encerrada", { code: error?.code, message: error?.message });
  };
  client.on("error", onClientError);
  try {
    await client.query(buildBeginStatement());
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch (rollbackError) {
      // Nao mascara o erro original; descarta a conexao em estado incerto.
      releaseError = rollbackError;
      console.error("[db] rollback falhou; conexao descartada", {
        code: rollbackError?.code,
        message: rollbackError?.message
      });
    }
    throw error;
  } finally {
    client.removeListener("error", onClientError);
    client.release(releaseError);
  }
}

// Timeouts de servidor por transacao via SET LOCAL: valem so dentro da
// transacao, entao funcionam tambem atras do PgBouncer do Neon (modo
// transaction), que nao preserva SET de sessao e pode rejeitar parametros de
// startup como statement_timeout. Os valores sao inteiros validados.
export function buildBeginStatement(env = process.env) {
  const timeouts = getTransactionTimeouts(env);
  return [
    "begin",
    `set local statement_timeout = ${timeouts.statementTimeoutMs}`,
    `set local lock_timeout = ${timeouts.lockTimeoutMs}`,
    `set local idle_in_transaction_session_timeout = ${timeouts.idleInTransactionTimeoutMs}`
  ].join("; ");
}

export function getTransactionTimeouts(env = process.env) {
  return {
    statementTimeoutMs: readMs(env.DATABASE_STATEMENT_TIMEOUT_MS, 15_000),
    // Preference creation holds the order lock during the provider call (10s).
    lockTimeoutMs: readMs(env.DATABASE_LOCK_TIMEOUT_MS, 15_000),
    idleInTransactionTimeoutMs: readMs(env.DATABASE_IDLE_IN_TRANSACTION_TIMEOUT_MS, 30_000)
  };
}

export function getPoolTimeouts(env = process.env) {
  return {
    connectionTimeoutMillis: readMs(env.DATABASE_CONNECTION_TIMEOUT_MS, 10_000),
    idleTimeoutMillis: readMs(env.DATABASE_IDLE_TIMEOUT_MS, 30_000)
  };
}

function readMs(value, fallback) {
  const number = Number(String(value ?? "").trim());
  if (!String(value ?? "").trim() || !Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(600_000, Math.max(100, Math.floor(number)));
}

export async function closePool() {
  const state = getPoolState();
  if (state.creating) await state.creating;
  if (state.pool) await state.pool.end();
  state.pool = null;
  state.creating = null;
  state.connectionKey = "";
}
