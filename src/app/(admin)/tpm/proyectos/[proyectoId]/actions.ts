'use server';

import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth/assert';
import { getPool, withTransaction } from '@/lib/db/client';
import { obtenerProyecto } from '@/lib/db/proyectos';
import { obtenerAdjuntosSvg } from '@/lib/db/adjuntos';
import { crearPropuestaParaProyecto } from '@/lib/db/propuestas';
import { resolverAlerta } from '@/lib/db/alertas';
import { ejecutarMotor } from '@/lib/engine';

const ReanalizarProyectoSchema = z.object({
  proyectoId: z.string().uuid(),
});

export interface PropuestaGenerada {
  propuestaId: string;
}

/**
 * Limitación real, no un descuido (ver lib/db/adjuntos.ts): solo puede
 * reconstruir las notas persistidas y los adjuntos vectoriales (guardados
 * como texto). Las rasterizadas de la carga original no sobreviven a este
 * punto porque nunca se guardaron — reanalizar un proyecto con imágenes
 * rasterizadas las pierde. Documentado, no oculto.
 */
export async function reanalizarProyecto(payload: unknown): Promise<PropuestaGenerada> {
  await requireAdminSession();
  const { proyectoId } = ReanalizarProyectoSchema.parse(payload);

  const pool = getPool();
  const proyecto = await obtenerProyecto(pool, proyectoId);
  if (!proyecto) {
    throw new Error(`Proyecto ${proyectoId} no encontrado.`);
  }
  if (!proyecto.descripcionNotas) {
    throw new Error('El proyecto no tiene notas guardadas para reanalizar.');
  }

  const adjuntosSvg = await obtenerAdjuntosSvg(pool, proyectoId);
  const promptEfectivo = proyecto.systemInstructions ?? null;

  const resultado = await ejecutarMotor(
    {
      projectName: proyecto.nombre,
      notes: proyecto.descripcionNotas,
      images: adjuntosSvg.map(a => ({
        name: a.nombreArchivo,
        mimeType: 'image/svg+xml',
        base64Data: a.contenidoSvg,
      })),
      model: proyecto.modeloIa,
      temperature: proyecto.temperatura,
    },
    { systemInstructionOverride: promptEfectivo }
  );

  const metadataConSnapshot = {
    ...resultado.metadata,
    promptUtilizado: promptEfectivo ?? '(default de system-instruction.ts)',
  };

  return withTransaction(client =>
    crearPropuestaParaProyecto(
      client,
      proyectoId,
      { monedaCotizacion: 'USD', tipoCambioUsdArs: null },
      resultado,
      metadataConSnapshot
    )
  );
}

const ResolverAlertaSchema = z.object({
  alertaId: z.string().uuid(),
  resolucionAplicada: z.string().trim().min(1).max(2000),
});

export async function resolverAlertaConflicto(payload: unknown): Promise<void> {
  await requireAdminSession();
  const datos = ResolverAlertaSchema.parse(payload);
  await withTransaction(client => resolverAlerta(client, datos.alertaId, datos.resolucionAplicada));
}
