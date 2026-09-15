import 'server-only';

/**
 * Invariantes "blandos" (README §10) — correcciones, no motivos de rechazo.
 * Se aplican UNA SOLA VEZ sobre la respuesta que ya ganó la cascada de
 * `inference.ts` y ya pasó `MotorOutputDataSchema` (los invariantes "duros",
 * INV-04 y INV-06, viven en ese schema porque ahí sí ameritan reintentar con
 * otro modelo — ver contracts.ts).
 *
 * INV-02 (recalcular horas totales) no está acá: ya lo resuelve
 * `recalcularHorasTotales()` en parse.ts desde la Fase 1.
 *
 * INV-07 (ninguna tarea del backlog base cita exclusivamente una fuente
 * BOCETO_*) queda deliberadamente FUERA de esta fase: `RESPONSE_SCHEMA` no
 * le pide al modelo una fuente por tarea (solo `alertas_conflictos` tiene
 * fuente_imagen/fuente_texto), así que no hay campo que inspeccionar sin
 * antes ampliar el contrato de salida de la IA. Verificarlo de verdad es un
 * cambio de alcance distinto — no un chequeo que falte agregar aquí.
 */
import type {MotorOutputData} from './contracts';

const ROLES_VALIDOS = ['Fullstack', 'Frontend', 'Backend', 'DevOps', 'QA', 'UI/UX', 'Otro'] as const;
const IMPACTOS_VALIDOS = ['Alto', 'Medio', 'Bajo'] as const;

export interface ResultadoInvariantesSuaves {
  data: MotorOutputData;
  correcciones: string[];
}

export function aplicarInvariantesSuaves(dataOriginal: MotorOutputData): ResultadoInvariantesSuaves {
  const correcciones: string[] = [];

  // INV-01: extras_opcionales siempre con 0 horas — es la garantía ejecutable
  // del Aislamiento de Alcance.
  const extras_opcionales = dataOriginal.extras_opcionales.map((extra) => {
    if (extra.horas_estimadas !== undefined && extra.horas_estimadas !== 0) {
      correcciones.push(
        `extras_opcionales "${extra.titulo}": horas_estimadas forzado de ${extra.horas_estimadas} a 0 (INV-01)`
      );
      return {...extra, horas_estimadas: 0};
    }
    return extra;
  });

  // INV-03: rol fuera de la allowlist de database-schema.md -> 'Otro' + marca para revisión.
  const hitos = dataOriginal.hitos.map((hito) => ({
    ...hito,
    tareas: hito.tareas.map((tarea) => {
      if (!(ROLES_VALIDOS as readonly string[]).includes(tarea.rol)) {
        correcciones.push(`tarea "${tarea.titulo}": rol "${tarea.rol}" reasignado a "Otro" (INV-03)`);
        return {...tarea, rol: 'Otro'};
      }
      return tarea;
    }),
  }));

  // INV-05: impacto fuera de {Alto, Medio, Bajo} -> normalizado a 'Medio'.
  const sugerencias_proactivas = dataOriginal.sugerencias_proactivas.map((sugerencia) => {
    if (sugerencia.impacto !== undefined && !(IMPACTOS_VALIDOS as readonly string[]).includes(sugerencia.impacto)) {
      correcciones.push(
        `sugerencia "${sugerencia.titulo}": impacto "${sugerencia.impacto}" normalizado a "Medio" (INV-05)`
      );
      return {...sugerencia, impacto: 'Medio'};
    }
    return sugerencia;
  });

  return {
    data: {...dataOriginal, extras_opcionales, hitos, sugerencias_proactivas},
    correcciones,
  };
}
