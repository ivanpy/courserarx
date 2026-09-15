import 'server-only';

/**
 * RES-07 — circuit breaker por modelo.
 *
 * Estado en memoria del proceso: un `Map` a nivel de módulo, no persistido
 * (no hay DB hasta la Fase 6) y no compartido entre instancias del servidor.
 * Suficiente para el objetivo real: dejar de gastar latencia reintentando un
 * modelo que ya viene fallando de forma consecutiva DENTRO del mismo proceso
 * activo, no coordinar resiliencia entre réplicas.
 */
import type {ModeloId} from './models';

interface EstadoCircuito {
  fallosConsecutivos: number;
  abiertoHasta: number;
}

const UMBRAL_FALLOS = 3;
const COOLDOWN_MS = 30_000;

const estado = new Map<string, EstadoCircuito>();

export function estaAbierto(modelo: ModeloId | string): boolean {
  const registro = estado.get(modelo);
  return Boolean(registro && registro.abiertoHasta > Date.now());
}

export function registrarResultado(modelo: ModeloId | string, exito: boolean): void {
  if (exito) {
    estado.delete(modelo);
    return;
  }

  const registro = estado.get(modelo) ?? {fallosConsecutivos: 0, abiertoHasta: 0};
  registro.fallosConsecutivos += 1;
  if (registro.fallosConsecutivos >= UMBRAL_FALLOS) {
    registro.abiertoHasta = Date.now() + COOLDOWN_MS;
  }
  estado.set(modelo, registro);
}
