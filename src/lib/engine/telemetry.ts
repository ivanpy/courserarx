import 'server-only';

/**
 * SEC-09 — versión mínima sin persistencia. La Fase 6 la reemplaza por una
 * escritura real en `propuestas.metadata_json` (RES-10). Por ahora solo
 * estructura el log del servidor para que sea buscable por `requestId`, sin
 * loguear jamás la clave, el prompt completo ni el contenido íntegro del
 * cliente — únicamente metadatos de la ejecución.
 */
export interface EventoMotor {
  requestId: string;
  modeloSolicitado: string;
  modeloUsado?: string;
  latenciaMs: number;
  riesgoInjection?: string;
  resultado: 'ok' | 'error';
  errorType?: string;
}

export function registrarEventoMotor(evento: EventoMotor): void {
  console.log('[motor]', JSON.stringify(evento));
}
