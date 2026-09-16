import 'server-only';
import type { Pool, PoolClient } from 'pg';

type Consultable = Pool | PoolClient;

export interface UsuarioAutenticable {
  id: string;
  email: string;
  passwordHash: string;
  rol: 'admin';
}

export async function obtenerUsuarioPorEmail(db: Consultable, email: string): Promise<UsuarioAutenticable | null> {
  const { rows } = await db.query(
    `SELECT id, email, password_hash, rol FROM usuarios WHERE email = $1`,
    [email]
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, passwordHash: row.password_hash, rol: row.rol };
}
