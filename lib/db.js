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
  const ssl = process.env.DATABASE_SSL === "false" || isLocal
    ? false
    : { rejectUnauthorized: false };
  const connectionKey = `${connectionString}|ssl:${Boolean(ssl)}`;
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
    const pool = new Pool({ connectionString, ssl });
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
  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  const state = getPoolState();
  if (state.creating) await state.creating;
  if (state.pool) await state.pool.end();
  state.pool = null;
  state.creating = null;
  state.connectionKey = "";
}
