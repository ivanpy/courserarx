'use client';

import { useState } from 'react';
import type { MotorErrorPublico } from '@/types';

interface ErrorReviewPanelProps {
  error: MotorErrorPublico;
  onDismiss: () => void;
  onRetry?: () => void;
}

const ETIQUETAS_TIPO: Record<MotorErrorPublico['errorType'], string> = {
  VALIDATION_ERROR: 'Entrada inválida',
  CONFIGURATION_ERROR: 'Error de configuración del servidor',
  KNOWN_RATE_LIMIT_OR_DEMAND: 'Alta demanda / cuota del proveedor',
  TIMEOUT: 'Tiempo de espera agotado',
  UNHANDLED_ERROR: 'Error no clasificado',
};

/**
 * Consume MotorErrorPublico (README §árbol final) — la proyección segura que
 * ya recorta stack/mensaje crudo del SDK/triedModels (RES-08, D-09). No hay
 * nada más rico que mostrar: lo que no está en este DTO nunca cruzó al
 * cliente, a propósito.
 */
export function ErrorReviewPanel({ error, onDismiss, onRetry }: ErrorReviewPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(error, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro): no es crítico.
    }
  };

  return (
    <div className="rounded-2xl border border-rose-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-rose-50 via-white to-amber-50 border-b border-rose-100 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              {ETIQUETAS_TIPO[error.errorType] ?? error.errorType}
            </span>
            {error.isRateLimitOrDemand && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Recuperable
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-rose-950 mt-2 whitespace-pre-wrap">{error.error}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Descartar"
        >
          ✕
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <div>
          <span className="font-semibold text-slate-700">Request ID:</span>{' '}
          <span className="font-mono">{error.requestId}</span>
        </div>
        <div className="text-right">
          <span className="font-semibold text-slate-700">Marca temporal:</span>{' '}
          {new Date(error.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCopiar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
        >
          {copied ? 'Copiado' : 'Copiar diagnóstico'}
        </button>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
