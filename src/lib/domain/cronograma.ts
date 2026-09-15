import type { Hito } from '../../types';
import { horasPorHito } from './horas';

export interface HitoProyectado {
  hito: Hito;
  index: number;
  horas: number;
  diasOffset: number;
  fechaEntrega: Date;
}

function diasOffsetPorHoras(horasAcumuladas: number, capacidadSemanal: number): number {
  return Math.ceil((horasAcumuladas / capacidadSemanal) * 7);
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/**
 * Proyecta la fecha de entrega de cada hito a partir de `startDate` (recibida como
 * parámetro, nunca `new Date()` interno) sumando el acumulado de horas de los hitos
 * hasta ese punto dividido por la capacidad semanal, expresado en días.
 */
export function proyectarHitos(hitos: Hito[] | undefined, startDate: Date, capacidadSemanal: number): HitoProyectado[] {
  let acumulado = 0;
  return (hitos || []).map((hito, idx) => {
    const horas = horasPorHito(hito);
    acumulado += horas;
    const diasOffset = diasOffsetPorHoras(acumulado, capacidadSemanal);
    return {
      hito,
      index: idx + 1,
      horas,
      diasOffset,
      fechaEntrega: sumarDias(startDate, diasOffset),
    };
  });
}

export function fechaFinProyecto(totalHoras: number, startDate: Date, capacidadSemanal: number): Date {
  return sumarDias(startDate, diasOffsetPorHoras(totalHoras, capacidadSemanal));
}
