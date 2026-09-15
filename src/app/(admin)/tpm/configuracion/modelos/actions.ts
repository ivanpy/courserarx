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
  temperature: z.number().min(0).max(0.4),
});

/** ModelProfileSelector solo manda ids de preset + temperatura acotada — nunca topK/topP (Regla de Oro VAL-02/Resolución #3). */
export async function guardarPerfilInferencia(payload: unknown): Promise<void> {
  await requireAdminSession();
  const datos = GuardarPerfilSchema.parse(payload);
  await withTransaction(client => actualizarPerfilInferencia(client, datos.proyectoId, datos.modeloId, datos.temperature));
}
