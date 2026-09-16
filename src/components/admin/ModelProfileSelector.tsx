'use client';

import { useState, useTransition } from 'react';
import { guardarPerfilInferencia } from '@/app/(admin)/tpm/configuracion/modelos/actions';

interface ModelProfileSelectorProps {
  proyectoId: string;
  modeloActual: string;
}

/**
 * Presets cerrados, no un <select> de los 5 modelos de MODELOS_PERMITIDOS
 * (ese enum es server-only, lib/engine/models.ts). README §árbol final:
 * "ModelProfileSelector... solo ids; jamás ve topK/topP/temp" — el único
 * dato que cruza al servidor es uno de estos dos ids; la temperatura la
 * fija el servidor (ver TEMPERATURA_PERFIL en la Server Action).
 */
const PRESETS = [
  { id: 'gemini-3.5-flash', etiqueta: 'Preciso', descripcion: 'Máxima disponibilidad y velocidad' },
  { id: 'gemini-3.8-flash', etiqueta: 'Fallback', descripcion: 'Sujeto a cuota y alta demanda' },
] as const;

export function ModelProfileSelector({ proyectoId, modeloActual }: ModelProfileSelectorProps) {
  const [seleccionado, setSeleccionado] = useState(modeloActual);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const elegir = (modeloId: string) => {
    setError(null);
    const anterior = seleccionado;
    setSeleccionado(modeloId);
    startTransition(async () => {
      try {
        await guardarPerfilInferencia({ proyectoId, modeloId });
      } catch {
        setSeleccionado(anterior);
        setError('No se pudo guardar el perfil de inferencia. Intentá de nuevo.');
      }
    });
  };

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">Perfil de inferencia</p>

      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            disabled={pending}
            onClick={() => elegir(preset.id)}
            className={`text-left rounded-xl border p-3 transition-colors cursor-pointer disabled:opacity-60 ${
              seleccionado === preset.id
                ? 'border-indigo-500 bg-indigo-50/60'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{preset.etiqueta}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{preset.descripcion}</p>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
