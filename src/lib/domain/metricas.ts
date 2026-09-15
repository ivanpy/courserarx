import type { ProposalResult } from '../../types';
import { contarTareas } from './horas';
import { agregarHorasPorRol, type RolAgregado } from './roles';
import { calcularSemanasHabiles, calcularSprints, horasPorSprint } from './sprints';
import { calcularCosto } from './costos';
import { proyectarHitos, fechaFinProyecto, type HitoProyectado } from './cronograma';
import { nivelRiesgo, type NivelRiesgo } from './riesgo';
import { CAPACIDAD_SEMANAL_HORAS } from './constants';

export interface MetricasInput {
  proposal: ProposalResult;
  tarifaHora: number;
  capacidadSemanal?: number;
  startDate: Date;
}

export interface RolConCosto extends RolAgregado {
  porcentaje: number;
  costo: number;
}

export interface HitoMetrica extends HitoProyectado {
  costo: number;
  porcentaje: number;
}

export interface MetricasDTO {
  totalHoras: number;
  totalHitos: number;
  totalTareas: number;
  costoEstimado: number;
  semanasHabiles: number;
  sprintsEstimados: number;
  capacidadSemanal: number;
  horasPorSprint: number;
  rolesPorHoras: RolConCosto[];
  hitosProyectados: HitoMetrica[];
  fechaFinProyecto: Date;
  conflictosCount: number;
  extrasCount: number;
  sugerenciasCount: number;
  nivelRiesgo: NivelRiesgo;
}

/**
 * Único punto de cómputo de las métricas del panel ejecutivo. Combina horas, roles,
 * sprints, costos y cronograma sobre una propuesta ya validada (`horas_totales_validadas`
 * es la cifra autoritativa; no se recalcula acá — esa garantía es del motor, INV-02).
 */
export function calcularMetricas({
  proposal,
  tarifaHora,
  capacidadSemanal = CAPACIDAD_SEMANAL_HORAS,
  startDate,
}: MetricasInput): MetricasDTO {
  const totalHoras = proposal.horas_totales_validadas || 0;
  const totalHitos = proposal.hitos?.length || 0;
  const totalTareas = contarTareas(proposal.hitos);
  const costoEstimado = calcularCosto(totalHoras, tarifaHora);
  const conflictosCount = proposal.alertas_conflictos?.length || 0;

  const rolesPorHoras: RolConCosto[] = agregarHorasPorRol(proposal.hitos).map(r => ({
    ...r,
    porcentaje: totalHoras > 0 ? (r.horas / totalHoras) * 100 : 0,
    costo: calcularCosto(r.horas, tarifaHora),
  }));

  const hitosProyectados: HitoMetrica[] = proyectarHitos(proposal.hitos, startDate, capacidadSemanal).map(hp => ({
    ...hp,
    costo: calcularCosto(hp.horas, tarifaHora),
    porcentaje: totalHoras > 0 ? (hp.horas / totalHoras) * 100 : 0,
  }));

  return {
    totalHoras,
    totalHitos,
    totalTareas,
    costoEstimado,
    semanasHabiles: calcularSemanasHabiles(totalHoras, capacidadSemanal),
    sprintsEstimados: calcularSprints(totalHoras, capacidadSemanal),
    capacidadSemanal,
    horasPorSprint: horasPorSprint(capacidadSemanal),
    rolesPorHoras,
    hitosProyectados,
    fechaFinProyecto: fechaFinProyecto(totalHoras, startDate, capacidadSemanal),
    conflictosCount,
    extrasCount: proposal.extras_opcionales?.length || 0,
    sugerenciasCount: proposal.sugerencias_proactivas?.length || 0,
    nivelRiesgo: nivelRiesgo(conflictosCount),
  };
}
