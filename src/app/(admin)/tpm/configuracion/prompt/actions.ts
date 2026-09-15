'use server';

import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth/assert';
import { withTransaction } from '@/lib/db/client';
import { actualizarPrompt } from '@/lib/db/proyectos';

const GuardarPromptSchema = z.object({
  proyectoId: z.string().uuid(),
  systemInstructions: z.string().trim().min(1).max(20_000),
});

/** Mantiene proyectos.system_instructions como el prompt actual editable (Resolución #2 de la Fase 7, sin tabla de versionado). */
export async function guardarPrompt(payload: unknown): Promise<void> {
  await requireAdminSession();
  const datos = GuardarPromptSchema.parse(payload);
  await withTransaction(client => actualizarPrompt(client, datos.proyectoId, datos.systemInstructions));
}
