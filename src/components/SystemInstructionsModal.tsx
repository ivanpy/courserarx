import React, { useState } from 'react';
import { X, BookOpen, Copy, Check, CheckCircle2 } from 'lucide-react';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '../data/defaults';

interface SystemInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInstructions: string;
  setSystemInstructions: (val: string) => void;
}

export const SystemInstructionsModal: React.FC<SystemInstructionsModalProps> = ({
  isOpen,
  onClose,
  systemInstructions,
  setSystemInstructions
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(systemInstructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSystemInstructions(DEFAULT_SYSTEM_INSTRUCTIONS);
  };

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
                1. Instrucciones del Sistema (System Instructions)
              </h3>
              <p className="text-xs text-slate-500">
                Reglas aplicadas por el Senior TPM y Arquitecto Fullstack
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
          {/* Rules Summary Card */}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Prompt del Sistema Activo (Personalizable)
            </label>
            <textarea
              rows={10}
              value={systemInstructions}
              onChange={e => setSystemInstructions(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer"
          >
            Restaurar Original
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado al portapapeles' : 'Copiar para AI Studio'}</span>
            </button>
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
    </div>
  );
};
