import 'server-only';

/**
 * E6 del pipeline — parseo defensivo de la respuesta del modelo (puerto de
 * server.ts:320-332) y recómputo del total de horas (puerto de
 * server.ts:334-348, ya presente en el comportamiento actual de la app).
 *
 * La re-validación Zod completa de la salida (VAL-07) y los invariantes
 * INV-01..07 sobre extras_opcionales/roles/rangos son la Fase 3 (D-07): aquí
 * solo se preserva paridad funcional, no se amplía el alcance.
 */

export function parsearRespuestaMotor(rawJson: string): Record<string, unknown> {
  try {
    return JSON.parse(rawJson);
  } catch {
    // El modelo a veces envuelve la salida en un bloque de código markdown.
    const limpio = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    // TODO(Fase 3 · RES-06): este segundo parseo tampoco está protegido — un
    // JSON truncado por MAX_TOKENS todavía puede lanzar y llegar como
    // UNHANDLED_ERROR genérico en vez de un error reintentable específico.
    return JSON.parse(limpio);
  }
}

/** Re-suma las horas para garantizar exactitud matemática, igual que server.ts:334-348. */
export function recalcularHorasTotales(parsedData: Record<string, unknown>): number {
  let total = 0;
  const hitos = parsedData?.hitos;
  if (Array.isArray(hitos)) {
    for (const hito of hitos) {
      const tareas = (hito as Record<string, unknown> | null)?.tareas;
      if (Array.isArray(tareas)) {
        for (const tarea of tareas) {
          total += Number((tarea as Record<string, unknown> | null)?.horas) || 0;
        }
      }
    }
  }
  return total;
}
