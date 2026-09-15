import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { Client } from 'pg';

// Script mínimo (Fase 6, Paso 1): no es el `npm run cli db migrate` de §12
// del README — ese CLI todavía no existe. Se ejecuta con `tsx db/migrate.ts`.
dotenv.config({ path: path.join(import.meta.dirname, '..', '.env.local'), quiet: true });

const DB_DIR = import.meta.dirname;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Tabla de control propia del runner, fuera de las 11 tablas del dominio
    // (database-schema.md): evita reaplicar un archivo ya ejecutado.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const applied = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map(
        (r: { filename: string }) => r.filename
      )
    );

    const files = fs
      .readdirSync(DB_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] ya aplicada: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(DB_DIR, file), 'utf8');
      console.log(`[migrate] aplicando: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('[migrate] listo.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('[migrate] error:', err);
  process.exitCode = 1;
});
