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

export interface GuardarPromptState {
  ok: boolean;
  error: string | null;
}

/**
 * README §árbol final: PromptEditor es "textarea NO controlada + <form
 * action>" — el mismo patrón que LoginForm/loginAction. `proyectoId` llega
 * pre-vinculado vía `guardarPrompt.bind(null, proyectoId)` en el cliente
 * (convención de Next para pasar argumentos extra a una Server Action usada
 * con useActionState); FormData trae solo el campo del textarea.
 * Mantiene proyectos.system_instructions como el prompt actual editable
 * (Resolución #2 de la Fase 7, sin tabla de versionado).
 */
export async function guardarPrompt(
  proyectoId: string,
  _prevState: GuardarPromptState,
  formData: FormData
): Promise<GuardarPromptState> {
  await requireAdminSession();
  const parsed = GuardarPromptSchema.safeParse({
    proyectoId,
    systemInstructions: formData.get('systemInstructions'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  await withTransaction(client => actualizarPrompt(client, parsed.data.proyectoId, parsed.data.systemInstructions));
  return { ok: true, error: null };
}
