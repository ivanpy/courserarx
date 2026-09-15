import 'server-only';
import { Pool, type PoolClient } from 'pg';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está configurada en el entorno del servidor.');
  }
  return url;
}

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

/**
 * Toda la descendencia de una propuesta (hitos, tareas, tarifas aplicadas,
 * alertas, extras, sugerencias) se escribe en una sola transacción — una
 * propuesta parcialmente persistida corrompería los totales del panel
 * ejecutivo (README §11).
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
