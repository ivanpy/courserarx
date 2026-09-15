import React from 'react';
import { X, Settings2, Sliders, Cpu } from 'lucide-react';
import { ModeloPublico } from '../types';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  setModel: (val: string) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  modelos: ModeloPublico[];
}

// Fase 2 (cierra D-02, D-03): el <select> ya no lista modelos hardcodeados
// que el servidor podía o no aceptar — se llena con el DTO ModeloPublico
// (§4.1, §4.2) que expone /api/modelos, la misma allowlist que valida
// contracts.ts. El bloque "Top K: 40 / Top P: 0.95" desapareció: son
// constantes de servidor sin representación en el cliente. El slider de
// temperature baja su tope de 1.0 a 0.4 para que coincida con el clamp real
// del servidor — antes se podía arrastrar hasta 1.0 aunque el valor
// terminara acotado silenciosamente.
export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  model,
  setModel,
  temperature,
  setTemperature,
  modelos
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Configuración del Modelo
              </h3>
              <p className="text-xs text-slate-500">
                Parámetros recomendados para máxima precisión
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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              Modelo de IA
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={modelos.length === 0}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer disabled:opacity-50"
            >
              {modelos.length === 0 && <option value={model}>Cargando catálogo del servidor…</option>}
              {modelos.map(m => (
                <option key={m.id} value={m.id} disabled={!m.disponible}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Capacidad multimodal optimizada para analizar wireframes, diagramas y mockups con tolerancia a fallos.
            </p>
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                Temperature: <span className="font-mono text-blue-600 font-bold">{temperature}</span>
              </label>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                Recomendado: 0.1
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0.0 (Determinístico / Sin alucinaciones)</span>
              <span>0.4 (Máximo permitido)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              Una temperatura baja (0.1) asegura que la estimación de horas y la detección de discrepancias sea estricta, evitando tareas inventadas. El servidor acota este valor a un máximo de 0.4.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
