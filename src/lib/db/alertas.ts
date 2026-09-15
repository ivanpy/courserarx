import 'server-only';
import type { PoolClient } from 'pg';

export async function resolverAlerta(client: PoolClient, alertaId: string, resolucionAplicada: string): Promise<void> {
  const { rowCount } = await client.query(
    `UPDATE alertas_conflictos SET resuelto = true, resolucion_aplicada = $2 WHERE id = $1`,
    [alertaId, resolucionAplicada]
  );
  if (rowCount === 0) {
    throw new Error(`Alerta ${alertaId} no encontrada.`);
  }
}
