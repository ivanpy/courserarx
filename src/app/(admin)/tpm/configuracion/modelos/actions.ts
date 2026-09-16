'use server';

import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth/assert';
import { withTransaction } from '@/lib/db/client';
import { actualizarPerfilInferencia } from '@/lib/db/proyectos';
import { MODELOS_PERMITIDOS } from '@/lib/engine/models';

const GuardarPerfilSchema = z.object({
  proyectoId: z.string().uuid(),
  modeloId: z.enum(MODELOS_PERMITIDOS),
});

/**
 * Temperatura fija de negocio (CLAUDE.md §4, business-rules.md): no es un
 * parámetro de UI. README §árbol final: "ModelProfileSelector... jamás ve
 * topK/topP/temp" — el cliente solo elige un id de preset cerrado, nunca un
 * número de inferencia.
 */
const TEMPERATURA_PERFIL = 0.1;

export async function guardarPerfilInferencia(payload: unknown): Promise<void> {
  await requireAdminSession();
  const datos = GuardarPerfilSchema.parse(payload);
  await withTransaction(client =>
    actualizarPerfilInferencia(client, datos.proyectoId, datos.modeloId, TEMPERATURA_PERFIL)
  );
}
