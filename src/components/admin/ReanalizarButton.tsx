'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reanalizarProyecto } from '@/app/(admin)/tpm/proyectos/[proyectoId]/actions';
import { ErrorReviewPanel } from './ErrorReviewPanel';
import type { MotorErrorPublico } from '@/types';

interface ReanalizarButtonProps {
  proyectoId: string;
  tieneNotas: boolean;
}

function errorGenerico(mensaje: string): MotorErrorPublico {
  return {
    error: mensaje,
    errorType: 'UNHANDLED_ERROR',
    isRateLimitOrDemand: false,
    requestId: `client-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Único consumidor de `reanalizarProyecto` (Paso 1): reconstruye la
 * propuesta a partir de notas + SVGs ya persistidos, sin volver a pedir
 * imágenes rasterizadas (esas no sobrevivieron — ver lib/db/adjuntos.ts).
 * `router.refresh()` en éxito: la propuesta nueva se lee en el próximo
 * render del Server Component, sin duplicar la lógica de fetch acá.
 */
export function ReanalizarButton({ proyectoId, tieneNotas }: ReanalizarButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<MotorErrorPublico | null>(null);

  const ejecutar = () => {
    setError(null);
    startTransition(async () => {
      try {
        const resultado = await reanalizarProyecto({ proyectoId });
        if (!resultado.ok) {
          setError(resultado.error);
          return;
        }
        router.refresh();
      } catch {
        setError(errorGenerico('No se pudo generar la propuesta. Intentá de nuevo.'));
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={ejecutar}
        disabled={pending || !tieneNotas}
        title={!tieneNotas ? 'El proyecto no tiene notas guardadas.' : undefined}
        className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Generando…' : 'Reanalizar (notas + SVGs guardados)'}
      </button>
      {error && <ErrorReviewPanel error={error} onDismiss={() => setError(null)} onRetry={ejecutar} />}
    </div>
  );
}
