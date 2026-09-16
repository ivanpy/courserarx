'use server';

import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth/assert';
import { getPool, withTransaction } from '@/lib/db/client';
import { insertarProyecto, obtenerProyecto } from '@/lib/db/proyectos';
import { insertarAdjuntos, type DatosAdjunto } from '@/lib/db/adjuntos';
import { crearPropuestaParaProyecto } from '@/lib/db/propuestas';
import { ejecutarMotor, MotorError, type MotorErrorPublico } from '@/lib/engine';
import { clasificarYSanearAdjunto } from '@/lib/engine/sanitize';

const ImagenEntradaSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1),
});

const CrearProyectoSchema = z.object({
  nombre: z.string().trim().min(1).max(255),
  notas: z.string().trim().min(1).max(100_000),
  imagenes: z.array(ImagenEntradaSchema).max(8).default([]),
});

export interface ProyectoCreado {
  proyectoId: string;
}

/**
 * No hay storage real para rasterizadas (ver lib/db/adjuntos.ts): se
 * clasifican con el MISMO clasificador que usa el motor (sanitize.ts, E2)
 * para no divergir en qué cuenta como SVG, y solo persiste metadata +
 * texto de SVG. `descartado` (bytes inválidos) ni se guarda: el motor
 * tampoco lo habría usado.
 */
export async function crearProyecto(payload: unknown): Promise<ProyectoCreado> {
  await requireAdminSession();
  const datos = CrearProyectoSchema.parse(payload);

  return withTransaction(async client => {
    const proyectoId = await insertarProyecto(client, {
      nombre: datos.nombre,
      descripcionNotas: datos.notas,
    });

    const adjuntos: DatosAdjunto[] = datos.imagenes
      .map(img => clasificarYSanearAdjunto({ name: img.name, mimeType: img.mimeType, base64Data: img.base64Data }))
      .flatMap((clasificado): DatosAdjunto[] => {
        if (clasificado.kind === 'svg') {
          return [
            {
              nombreArchivo: clasificado.name,
              mimeType: 'image/svg+xml',
              tamanoBytes: clasificado.svgText.length,
              contenidoSvg: clasificado.svgText,
            },
          ];
        }
        if (clasificado.kind === 'raster') {
          return [
            {
              nombreArchivo: clasificado.name,
              mimeType: clasificado.mimeType,
              tamanoBytes: Math.ceil((clasificado.base64.length * 3) / 4),
              contenidoSvg: null,
            },
          ];
        }
        return [];
      });

    if (adjuntos.length > 0) {
      await insertarAdjuntos(client, proyectoId, adjuntos);
    }

    return { proyectoId };
  });
}

const AnalizarProyectoSchema = z.object({
  proyectoId: z.string().uuid(),
  notes: z.string().trim().min(1).max(100_000),
  images: z.array(ImagenEntradaSchema).max(8).default([]),
});

/**
 * `MotorError` (VALIDATION_ERROR, CONFIGURATION_ERROR, KNOWN_RATE_LIMIT_OR_DEMAND,
 * TIMEOUT) NUNCA se relanza crudo: un `throw` dentro de una Server Action solo
 * cruza al cliente como un digest genérico en producción (Next redacta el
 * mensaje real). `toPublic()` ya existe exactamente para poder devolver el
 * error como dato serializable — `ErrorReviewPanel` consume esta forma.
 */
export type ResultadoAnalisis = { ok: true; propuestaId: string } | { ok: false; error: MotorErrorPublico };

/**
 * VAL-02 final: el cliente manda `proyectoId` (más las imágenes, que nunca
 * se guardaron — ver crearProyecto), nunca el prompt. El prompt efectivo se
 * resuelve acá desde `proyectos.system_instructions`, detrás de
 * `assertAdmin()`, y se pasa a `ejecutarMotor()` como override server-only.
 * Resolución de arquitectura de la Fase 7: el snapshot del prompt usado
 * queda en `propuestas.metadata_json` para trazabilidad — nunca en
 * `MotorOutputMetadata` (eso lo vería el cliente de /api/motor, SEC-02).
 */
export async function analizarProyecto(payload: unknown): Promise<ResultadoAnalisis> {
  await requireAdminSession();
  const datos = AnalizarProyectoSchema.parse(payload);

  const proyecto = await obtenerProyecto(getPool(), datos.proyectoId);
  if (!proyecto) {
    throw new Error(`Proyecto ${datos.proyectoId} no encontrado.`);
  }

  const promptEfectivo = proyecto.systemInstructions ?? null;

  let resultado;
  try {
    resultado = await ejecutarMotor(
      {
        projectName: proyecto.nombre,
        notes: datos.notes,
        images: datos.images,
        model: proyecto.modeloIa,
        temperature: proyecto.temperatura,
      },
      { systemInstructionOverride: promptEfectivo }
    );
  } catch (err) {
    if (err instanceof MotorError) {
      return { ok: false, error: err.toPublic() };
    }
    throw err;
  }

  const metadataConSnapshot = {
    ...resultado.metadata,
    promptUtilizado: promptEfectivo ?? '(default de system-instruction.ts)',
  };

  const { propuestaId } = await withTransaction(client =>
    crearPropuestaParaProyecto(
      client,
      datos.proyectoId,
      { monedaCotizacion: 'USD', tipoCambioUsdArs: null },
      resultado,
      metadataConSnapshot
    )
  );
  return { ok: true, propuestaId };
}
