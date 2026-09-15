import type { Hito, Tarea } from '../../types';

export function sumarHorasTareas(tareas: Tarea[] | undefined): number {
  return (tareas || []).reduce((acc, t) => acc + (Number(t.horas) || 0), 0);
}

export function horasPorHito(hito: Hito): number {
  return sumarHorasTareas(hito.tareas);
}

export function contarTareas(hitos: Hito[] | undefined): number {
  return (hitos || []).reduce((acc, h) => acc + (h.tareas?.length || 0), 0);
}
