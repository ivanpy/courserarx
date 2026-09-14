import React, { useState } from 'react';
import { ReviewableError } from '../types';
import { AlertTriangle, Copy, Check, RotateCcw, X, Terminal, Bug } from 'lucide-react';

interface ErrorReviewModalProps {
  error: ReviewableError | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorReviewModal: React.FC<ErrorReviewModalProps> = ({
  error,
  onClose,
  onRetry
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullTrace, setShowFullTrace] = useState(false);

  if (!error) return null;

  const handleCopyDiagnostics = async () => {
    const diagnosticData = {
      title: error.title,
      message: error.message,
      status: error.status,
      errorType: error.errorType,
      timestamp: error.timestamp,
      triedModels: error.triedModels,
      details: error.details,
      raw: error.raw
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-50 via-white to-amber-50 border-b border-rose-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {error.errorType || 'Error No Clasificado'}
                </span>
                {error.status && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    HTTP {error.status}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                {error.title || 'Error Detectado para tu Revisión'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Este comportamiento no corresponde a las incidencias conocidas de cuota/imágenes resueltas automáticamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Main Error Message */}
          <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-950 font-medium leading-relaxed">
            <div className="flex items-center gap-2 font-bold mb-1 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Descripción de la Excepción:
            </div>
            <p className="font-mono text-[12px] break-words whitespace-pre-wrap">
              {error.message}
            </p>
          </div>

          {/* Model Chain Tried */}
          {error.triedModels && error.triedModels.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Modelos evaluados durante la cascada de recuperación:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {error.triedModels.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Technical Trace */}
          {error.details && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Detalles Técnicos &amp; Stack Trace
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullTrace(prev => !prev)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  {showFullTrace ? 'Ocultar traza técnica' : 'Ver traza completa'}
                </button>
              </div>
              {showFullTrace && (
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-52 leading-relaxed whitespace-pre-wrap border border-slate-800">
                  {error.details}
                </div>
              )}
            </div>
          )}

          {/* Diagnostic Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <div>
              <span className="font-semibold text-slate-700">Marca temporal:</span>{' '}
              {new Date(error.timestamp).toLocaleString()}
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-700">Estado:</span> Esperando acción del usuario
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">¡Diagnóstico Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Diagnóstico para Revisar</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 font-semibold text-xs transition-colors cursor-pointer"
            >
              Descartar
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reintentar Análisis</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
