import { TARIFA_HORA_USD, TARIFA_HORA_USD_ANTERIOR } from './constants';
import { calcularSprints } from './sprints';
import { calcularCosto } from './costos';

export interface AjusteRecalculo {
  concepto: string;
  anterior: string;
  actual: string;
  motivo: string;
}

/**
 * Compara la cifra que habría producido la configuración anterior a la Fase 4 contra
 * la vigente. Devuelve solo los conceptos cuyo valor cambió de verdad para esta propuesta.
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
      motivo: `Un sprint son ${2} semanas (${capacidadSemanal * 2}h a ${capacidadSemanal}h/sem), no una.`
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
