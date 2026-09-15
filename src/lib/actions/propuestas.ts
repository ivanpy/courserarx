'use server';

import { requireAdminSession } from '../auth/assert';
import { withTransaction } from '../db/client';
import { crearPropuesta, type DatosProyecto, type DatosPropuesta, type PropuestaGuardada } from '../db/propuestas';
import type { MotorOutput } from '../engine';

export type { DatosProyecto, DatosPropuesta, PropuestaGuardada };

/**
 * SEC-03: la sesión se resuelve ANTES de cualquier trabajo, no como parte de
 * la transacción. Adaptador fino (§12): autorizar → delegar → listo.
 */
export async function guardarPropuesta(
  proyecto: DatosProyecto,
  datosPropuesta: DatosPropuesta,
  resultado: MotorOutput
): Promise<PropuestaGuardada> {
  await requireAdminSession();
  return withTransaction(client => crearPropuesta(client, proyecto, datosPropuesta, resultado));
}
