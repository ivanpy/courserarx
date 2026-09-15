import 'server-only';

/**
 * E6 del pipeline — parseo defensivo de la respuesta del modelo (puerto de
 * server.ts:320-332) y recómputo del total de horas (INV-02, puerto de
 * server.ts:334-348, ya presente en el comportamiento actual de la app).
 *
 * Fase 3 (RES-06, cierra D-07 junto con `MotorOutputDataSchema` en
 * contracts.ts): `parsearRespuestaMotor` ahora se invoca DENTRO del bucle de
 * `inference.ts`, no después — un JSON truncado por `MAX_TOKENS` ya no puede
 * escapar hacia un 500 genérico, se trata como un fallo más de ese candidato
 * y se prueba el siguiente modelo. La función en sí no cambió.
 */
import type {MotorOutputData} from './contracts';

export function parsearRespuestaMotor(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson);
  } catch {
    // El modelo a veces envuelve la salida en un bloque de código markdown.
    const limpio = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(limpio);
  }
}

/** Re-suma las horas para garantizar exactitud matemática, igual que server.ts:334-348. */
export function recalcularHorasTotales(data: MotorOutputData): number {
  let total = 0;
  for (const hito of data.hitos) {
    for (const tarea of hito.tareas) {
      total += tarea.horas;
    }
  }
  return total;
}
