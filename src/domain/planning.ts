/**
 * Fuente única de los parámetros de planificación y costo.
 * Regla estricta: .claude/rules/business-rules.md §1.
 */

export const TARIFA_HORA_USD = 35;
export const CAPACIDAD_SEMANAL_HORAS = 40;
export const SEMANAS_POR_SPRINT = 2;

/** Configuración vigente antes de la unificación, usada solo para explicar el recálculo al TPM. */
export const TARIFA_HORA_USD_ANTERIOR = 45;

export const horasPorSprint = (capacidadSemanal: number): number =>
  capacidadSemanal * SEMANAS_POR_SPRINT;

export const calcularSemanasHabiles = (totalHoras: number, capacidadSemanal: number): number =>
  Math.max(1, Math.ceil(totalHoras / capacidadSemanal));

export const calcularSprints = (totalHoras: number, capacidadSemanal: number): number =>
  Math.max(1, Math.ceil(totalHoras / horasPorSprint(capacidadSemanal)));

export const calcularCosto = (totalHoras: number, tarifaHora: number): number =>
  totalHoras * tarifaHora;

export interface AjusteRecalculo {
  concepto: string;
  anterior: string;
  actual: string;
  motivo: string;
}

/**
 * Compara la cifra que habría producido la configuración anterior contra la vigente.
 * Devuelve solo los conceptos cuyo valor cambió de verdad para esta propuesta.
 */
export function describirRecalculo(
  totalHoras: number,
  capacidadSemanal: number,
  tarifaHora: number
): AjusteRecalculo[] {
  const ajustes: AjusteRecalculo[] = [];

  // El dashboard trataba un sprint como una semana de capacidad en lugar de dos.
  const sprintsAnterior = Math.max(1, Math.ceil(totalHoras / capacidadSemanal));
  const sprintsActual = calcularSprints(totalHoras, capacidadSemanal);
  if (sprintsAnterior !== sprintsActual) {
    ajustes.push({
      concepto: 'Sprints estimados',
      anterior: `${sprintsAnterior} ${sprintsAnterior === 1 ? 'sprint' : 'sprints'}`,
      actual: `${sprintsActual} ${sprintsActual === 1 ? 'sprint' : 'sprints'}`,
      motivo: `Un sprint son ${SEMANAS_POR_SPRINT} semanas (${horasPorSprint(capacidadSemanal)}h a ${capacidadSemanal}h/sem), no una.`
    });
  }

  if (tarifaHora !== TARIFA_HORA_USD_ANTERIOR) {
    const costoAnterior = calcularCosto(totalHoras, TARIFA_HORA_USD_ANTERIOR);
    const costoActual = calcularCosto(totalHoras, tarifaHora);
    ajustes.push({
      concepto: 'Presupuesto estimado',
      anterior: `$${costoAnterior.toLocaleString()} USD (a $${TARIFA_HORA_USD_ANTERIOR}/h)`,
      actual: `$${costoActual.toLocaleString()} USD (a $${tarifaHora}/h)`,
      motivo: `La tarifa por defecto pasa a $${TARIFA_HORA_USD}/h según business-rules.md.`
    });
  }

  return ajustes;
}
