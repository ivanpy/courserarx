import { CAPACIDAD_SEMANAL_HORAS, SEMANAS_POR_SPRINT } from './constants';

export const horasPorSprint = (capacidadSemanal: number = CAPACIDAD_SEMANAL_HORAS): number =>
  capacidadSemanal * SEMANAS_POR_SPRINT;

export const calcularSemanasHabiles = (totalHoras: number, capacidadSemanal: number): number =>
  Math.max(1, Math.ceil(totalHoras / capacidadSemanal));

export const calcularSprints = (totalHoras: number, capacidadSemanal: number): number =>
  Math.max(1, Math.ceil(totalHoras / horasPorSprint(capacidadSemanal)));
