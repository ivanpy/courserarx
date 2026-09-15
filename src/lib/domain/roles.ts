import type { Hito, Tarea } from '../../types';

const ROL_POR_DEFECTO = 'Fullstack';

export interface RolAgregado {
  rol: string;
  horas: number;
  tareas: number;
}

export function rolesUnicos(tareas: Tarea[] | undefined): string[] {
  return Array.from(new Set((tareas || []).map(t => t.rol || ROL_POR_DEFECTO)));
}

/** Agrega horas y cantidad de tareas por rol a través de todos los hitos, ordenado de mayor a menor. */
export function agregarHorasPorRol(hitos: Hito[] | undefined): RolAgregado[] {
  const map = new Map<string, RolAgregado>();

  (hitos || []).forEach(hito => {
    (hito.tareas || []).forEach(t => {
      const rol = t.rol || ROL_POR_DEFECTO;
      const acc = map.get(rol) || { rol, horas: 0, tareas: 0 };
      acc.horas += Number(t.horas) || 0;
      acc.tareas += 1;
      map.set(rol, acc);
    });
  });

  return Array.from(map.values()).sort((a, b) => b.horas - a.horas);
}
