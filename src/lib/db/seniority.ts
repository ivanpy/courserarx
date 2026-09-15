import 'server-only';
import type { PoolClient } from 'pg';

/**
 * El motor de IA no emite `seniority` (§6 del contrato de datos): el servidor
 * lo asigna al persistir, desde `roles_seniority_default`. Solo 7 filas
 * posibles (una por rol de la allowlist) — traerlas todas de una vez evita
 * una consulta por tarea.
 */
export class ErrorConfiguracionSeniority extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorConfiguracionSeniority';
  }
}

export async function obtenerSeniorityPorDefecto(client: PoolClient): Promise<Map<string, string>> {
  const { rows } = await client.query<{ rol: string; seniority_default: string }>(
    'SELECT rol, seniority_default FROM roles_seniority_default'
  );
  return new Map(rows.map(r => [r.rol, r.seniority_default]));
}

/**
 * No cae a un default hardcodeado si falta la fila: si `roles_seniority_default`
 * no tiene el rol (p. ej. la tabla se editó a mano y quedó incompleta), es un
 * error de configuración real, no un valor a inventar.
 */
export function resolverSeniorityDefault(porDefecto: Map<string, string>, rol: string): string {
  const seniority = porDefecto.get(rol);
  if (!seniority) {
    throw new ErrorConfiguracionSeniority(`No hay seniority por defecto configurado para el rol '${rol}'.`);
  }
  return seniority;
}
