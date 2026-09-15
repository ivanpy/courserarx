/**
 * SEC-04 — rate limit en memoria para /api/motor (10 análisis / 10 min por defecto).
 * Mismo criterio que el circuit breaker de Fase 3 (lib/engine/circuit-breaker.ts):
 * estado de proceso, no persistido, no compartido entre réplicas/isolates — suficiente
 * para el objetivo real (acotar el gasto de un llamador dentro de un mismo proceso
 * activo), no coordinar límites entre instancias.
 *
 * A diferencia del circuit breaker (claves acotadas a un puñado de modelos), acá la
 * clave es una identidad de sesión/token — potencialmente ilimitada — así que hace
 * falta limpieza propia o el Map crecería sin cota. Nada de `setInterval`: el runtime
 * Edge de middleware.ts no garantiza que un timer de background siga vivo entre
 * invocaciones, así que la limpieza se dispara oportunistamente cada N verificaciones,
 * o de inmediato si el Map creció demasiado entre limpiezas.
 *
 * Sin `import 'server-only'`: debe poder ejecutarse en middleware.ts (Edge).
 */

interface Ventana {
  conteo: number;
  inicioMs: number;
}

const LIMITE_PETICIONES = 10;
const VENTANA_MS = 10 * 60 * 1000;
const LIMPIEZA_CADA_N_LLAMADAS = 100;
const MAX_ENTRADAS_ANTES_DE_FORZAR_LIMPIEZA = 5_000;

const estado = new Map<string, Ventana>();
let llamadas = 0;

function limpiarExpiradas(ahora: number): void {
  for (const [clave, ventana] of estado) {
    if (ahora - ventana.inicioMs > VENTANA_MS) {
      estado.delete(clave);
    }
  }
}

export interface ResultadoLimite {
  permitido: boolean;
  retryAfterSegundos?: number;
}

export function verificarLimite(clave: string): ResultadoLimite {
  const ahora = Date.now();

  llamadas += 1;
  if (llamadas % LIMPIEZA_CADA_N_LLAMADAS === 0 || estado.size > MAX_ENTRADAS_ANTES_DE_FORZAR_LIMPIEZA) {
    limpiarExpiradas(ahora);
  }

  const ventana = estado.get(clave);

  if (!ventana || ahora - ventana.inicioMs > VENTANA_MS) {
    estado.set(clave, { conteo: 1, inicioMs: ahora });
    return { permitido: true };
  }

  if (ventana.conteo >= LIMITE_PETICIONES) {
    const retryAfterSegundos = Math.ceil((ventana.inicioMs + VENTANA_MS - ahora) / 1000);
    return { permitido: false, retryAfterSegundos };
  }

  ventana.conteo += 1;
  return { permitido: true };
}
