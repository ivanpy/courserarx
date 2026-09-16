import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from 'pg';
import { hashPassword } from '../src/lib/auth/password';

// `npm run db:seed-admin -- email@dominio.com [password]`. Sin password,
// genera uno aleatorio y lo imprime — única vez que se ve en texto plano.
// No pasa por lib/db/usuarios.ts (server-only): mismo motivo que migrate.ts,
// este script corre con `tsx db/seed-admin.ts` sin --conditions=react-server.
dotenv.config({ path: path.join(import.meta.dirname, '..', '.env.local'), quiet: true });

function generarPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada.');
  }

  const email = (process.argv[2] ?? 'admin@backlog.ia').trim().toLowerCase();
  const password = process.argv[3] ?? generarPassword();
  const passwordHash = await hashPassword(password);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO usuarios (email, password_hash, rol)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
      [email, passwordHash]
    );
  } finally {
    await client.end();
  }

  console.log('[seed-admin] usuario admin listo:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main().catch(err => {
  console.error('[seed-admin] error:', err);
  process.exitCode = 1;
});
