import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Briefcase,
  Download,
  FileSpreadsheet,
  PlayCircle,
  X,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSample?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onLoadSample
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (dontShowAgain) {
      localStorage.setItem('backlog_ia_welcome_seen', 'true');
    }
  }, [dontShowAgain]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('backlog_ia_welcome_seen', 'true');
    }
    onClose();
  };

  const handleLoadSampleAndClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('backlog_ia_welcome_seen', 'true');
    }
    onClose();
    if (onLoadSample) {
      onLoadSample();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/30 text-[11px] font-semibold text-indigo-200 tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Gestión de Proyectos con IA</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                Bienvenido al Constructor de backlog.ia
              </h2>
              <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-xl">
                Una herramienta que te va a ayudar con la gestión de proyectos y la estimación profesional de software.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-indigo-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar bienvenida"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              ¿Qué hace esta herramienta por tu equipo?
            </h3>

            {/* 4 Core Value Pillars */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              {/* Pillar 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Desglosa transcripciones de reuniones
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pega notas desestructuradas, actas o transcripciones sobre las necesidades del cliente. La IA extrae los requerimientos reales y detecta procesos omitidos.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Permite subir capturas de bocetos
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Carga capturas de pantalla de wireframes, bocetos o diseños. El sistema los contrasta con el texto para identificar contradicciones o funciones no pedidas.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Construye el backlog con estimación de horas
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Divide el alcance en hitos claros y tareas atómicas con perfiles técnicos (Frontend, Backend, DevOps, QA) y horas validadas protegiendo tu presupuesto.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Elabora un resumen para la Gerencia
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Redacta una síntesis ejecutiva de alto nivel explicando el alcance acordado, los sprints estimados, costos proyectados y recomendaciones clave.
                </p>
              </div>
            </div>
          </div>

          {/* Export Formats Highlight Card */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Download className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-indigo-900 block text-xs">
                  Exportación flexible: Descarga JSON y Descarga de Hitos en CSV
                </span>
                <span className="text-indigo-800 text-[11px] block leading-relaxed">
                  Puedes descargar la propuesta completa en <strong>JSON estructurado</strong> o descargar los <strong>Hitos como archivo CSV</strong> para abrirlos directamente en Microsoft Excel, Google Sheets o importarlos a Jira.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-1 rounded bg-white text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1 text-[11px]">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                .CSV Hitos
              </span>
              <span className="px-2 py-1 rounded bg-white text-indigo-700 font-bold border border-indigo-200 text-[11px]">
                JSON
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <span>No volver a mostrar esta bienvenida automáticamente</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onLoadSample && (
              <button
                type="button"
                onClick={handleLoadSampleAndClose}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 text-indigo-600" />
                <span>Ver Ejemplo Turnero</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
            >
              <span>Empezar a Crear Backlog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
