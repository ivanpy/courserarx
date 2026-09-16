'use client';

import { useActionState } from 'react';
import { guardarPrompt, type GuardarPromptState } from '@/app/(admin)/tpm/configuracion/prompt/actions';

interface PromptEditorProps {
  proyectoId: string;
  initialValue: string | null;
}

const initialState: GuardarPromptState = { ok: false, error: null };

/**
 * README §árbol final: "textarea NO controlada + <form action>" — mismo
 * patrón que LoginForm/loginAction. `defaultValue` (no `value`/`onChange`):
 * React no vuelve a renderizar el textarea en cada tecla, el DOM es la
 * única fuente de verdad hasta el submit.
 */
export function PromptEditor({ proyectoId, initialValue }: PromptEditorProps) {
  const guardarConProyecto = guardarPrompt.bind(null, proyectoId);
  const [state, formAction, pending] = useActionState(guardarConProyecto, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <label htmlFor="systemInstructions" className="block text-xs uppercase font-bold text-slate-400 tracking-widest">
          System Instructions del proyecto
        </label>
        <span className="text-[11px] text-slate-400">Vacío = usa el default del motor</span>
      </div>

      <textarea
        id="systemInstructions"
        name="systemInstructions"
        defaultValue={initialValue ?? ''}
        rows={12}
        maxLength={20_000}
        placeholder="Dejá vacío para heredar el prompt por defecto del motor (lib/engine/system-instruction.ts)."
        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-mono leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
      />

      {state.error && (
        <p role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-emerald-600">Prompt guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? 'Guardando…' : 'Guardar prompt'}
      </button>
    </form>
  );
}
