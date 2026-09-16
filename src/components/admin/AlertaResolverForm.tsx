'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolverAlertaConflicto } from '@/app/(admin)/tpm/proyectos/[proyectoId]/actions';

interface AlertaResolverFormProps {
  alertaId: string;
}

/** Único consumidor de `resolverAlertaConflicto` (Paso 1, sin uso hasta ahora). */
export function AlertaResolverForm({ alertaId }: AlertaResolverFormProps) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const enviar = () => {
    if (!texto.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await resolverAlertaConflicto({ alertaId, resolucionAplicada: texto.trim() });
        router.refresh();
      } catch {
        setError('No se pudo guardar la resolución.');
      }
    });
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="text"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Cómo se resolvió…"
        className="flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={enviar}
        disabled={pending || !texto.trim()}
        className="cursor-pointer rounded-lg bg-amber-700 px-3 py-1 text-xs text-white disabled:opacity-50"
      >
        Marcar resuelta
      </button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}
