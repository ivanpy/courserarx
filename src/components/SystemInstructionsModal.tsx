import React from 'react';
import { X, BookOpen, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SystemInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fase 2 (cierra D-01, D-12): este modal dejó de ser un editor sobre el
// prompt maestro. Antes exponía una textarea con el texto completo de
// DEFAULT_SYSTEM_INSTRUCTIONS y lo enviaba tal cual al servidor en cada
// análisis — cualquiera podía reemplazar Master Truth y Scope Isolation.
// El prompt real ahora vive solo en src/lib/engine/system-instruction.ts
// (server-only); esto es únicamente informativo. Una UI para que el TPM
// configure perfiles de prompt por proyecto vuelve en la Fase 7, sobre
// Server Actions con sesión de Admin.
export const SystemInstructionsModal: React.FC<SystemInstructionsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Reglas del Senior TPM (Solo Lectura)
              </h3>
              <p className="text-xs text-slate-500">
                Aplicadas por el servidor en cada análisis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                1. Prioridad de Verdad (Master Truth)
              </div>
              <p className="text-slate-600">
                El texto manda sobre las imágenes. Lo que no está en el texto es referencia estética.
              </p>
            </div>
            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1">
              <div className="font-bold text-purple-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                2. Aislamiento de Alcance (0 Horas)
              </div>
              <p className="text-slate-600">
                Funciones vistas en fotos pero no pedidas se listan en 'extras_opcionales' con 0h.
              </p>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                3. Desglose Técnico Atómico
              </div>
              <p className="text-slate-600">
                Paso a paso ejecutable (ej: tablas DB, validación de solapamiento, selectores UI).
              </p>
            </div>
            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                4 &amp; 5. Gaps y Alertas de Conflicto
              </div>
              <p className="text-slate-600">
                Detecta procesos omitidos (anulaciones, feriados) y contradicciones evidentes.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              Estas reglas se aplican íntegramente en el servidor y no son configurables desde el
              navegador. La edición de perfiles de prompt por proyecto es una función de
              Administración que llega en una fase posterior de la migración.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
