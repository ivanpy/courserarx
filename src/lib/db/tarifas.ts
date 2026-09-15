import 'server-only';
import type { PoolClient } from 'pg';

export type Moneda = 'USD' | 'ARS';

export interface ParametrosResolucionTarifa {
  rol: string;
  seniority: string;
  monedaCotizacion: Moneda;
  tipoCambioUsdArs: number | null;
}

export interface TarifaResuelta {
  montoHora: number;
  moneda: Moneda;
  tarifaId: string;
}

/**
 * §6 de database-schema.md: nunca se cotiza con un número inventado. Si no hay
 * tarifa vigente ni forma de convertir desde la otra moneda, esto lanza en vez
 * de caer a un default silencioso.
 */
export class ErrorConfiguracionTarifa extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorConfiguracionTarifa';
  }
}

interface FilaTarifa {
  id: string;
  monto_hora: string;
}

async function buscarTarifaVigente(
  client: PoolClient,
  rol: string,
  seniority: string,
  moneda: Moneda
): Promise<FilaTarifa | null> {
  const { rows } = await client.query<FilaTarifa>(
    `SELECT id, monto_hora FROM tarifas
     WHERE rol = $1 AND seniority = $2 AND moneda = $3 AND vigente_hasta IS NULL
     LIMIT 1`,
    [rol, seniority, moneda]
  );
  return rows[0] ?? null;
}

function otraMoneda(moneda: Moneda): Moneda {
  return moneda === 'USD' ? 'ARS' : 'USD';
}

function convertir(montoHora: number, desde: Moneda, hacia: Moneda, tipoCambioUsdArs: number): number {
  if (desde === hacia) return montoHora;
  // tipo_cambio_usd_ars = cuántos ARS equivalen a 1 USD.
  return desde === 'USD' ? montoHora * tipoCambioUsdArs : montoHora / tipoCambioUsdArs;
}

/**
 * Orden de resolución (§6): (1) tarifa vigente en la moneda de la propuesta,
 * (2) vigente en la otra moneda convertida por `tipo_cambio_usd_ars`, (3) si
 * ninguna aplica, error de configuración — nunca una tarifa por defecto.
 */
export async function resolverTarifa(
  client: PoolClient,
  { rol, seniority, monedaCotizacion, tipoCambioUsdArs }: ParametrosResolucionTarifa
): Promise<TarifaResuelta> {
  const directa = await buscarTarifaVigente(client, rol, seniority, monedaCotizacion);
  if (directa) {
    return { montoHora: Number(directa.monto_hora), moneda: monedaCotizacion, tarifaId: directa.id };
  }

  const alterna = otraMoneda(monedaCotizacion);
  const enOtraMoneda = await buscarTarifaVigente(client, rol, seniority, alterna);

  if (!enOtraMoneda) {
    throw new ErrorConfiguracionTarifa(
      `No hay tarifa vigente para ${rol}/${seniority} en ${monedaCotizacion} ni en ${alterna}.`
    );
  }

  if (tipoCambioUsdArs === null) {
    throw new ErrorConfiguracionTarifa(
      `Hay tarifa vigente para ${rol}/${seniority} en ${alterna}, pero la propuesta no ` +
        `tiene tipo_cambio_usd_ars para convertirla a ${monedaCotizacion}.`
    );
  }

  const montoHora = convertir(Number(enOtraMoneda.monto_hora), alterna, monedaCotizacion, tipoCambioUsdArs);
  return { montoHora, moneda: monedaCotizacion, tarifaId: enOtraMoneda.id };
}
