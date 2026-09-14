import React from 'react';
import { Layers, BookOpen, Settings2, PlayCircle, Download, FileSpreadsheet, Sparkles, HelpCircle, Users } from 'lucide-react';

interface HeaderProps {
  onOpenInstructions: () => void;
  onOpenSettings: () => void;
  onOpenWelcome: () => void;
  onLoadTurneroSample: () => void;
  isAnalyzing: boolean;
  model?: string;
  temperature?: number;
  onExportJson?: () => void;
  onExportHitosCsv?: () => void;
  onExportHitosXlsx?: () => void;
  hasProposal?: boolean;
  viewMode?: 'stakeholder' | 'admin';
  onToggleViewMode?: (mode: 'stakeholder' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenInstructions,
  onOpenSettings,
  onOpenWelcome,
  onLoadTurneroSample,
  isAnalyzing,
  model = 'gemini-3.8-flash',
  temperature = 0.1,
  onExportJson,
  onExportHitosCsv,
  onExportHitosXlsx,
  hasProposal = false,
  viewMode = 'stakeholder',
  onToggleViewMode
}) => {
  const displayModel = (model || 'gemini-3.8-flash').replace('gemini-', 'Gemini ');
  const isStakeholder = viewMode === 'stakeholder';

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center flex-wrap gap-1.5">
              <span>Constructor de backlog.ia</span>
              {isStakeholder ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  <Users className="w-3 h-3" />
                  Vista Partes Interesadas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  <Settings2 className="w-3 h-3" />
                  Modo Administración
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Status Pill & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end text-xs sm:text-sm">
          {/* Audience / Role Mode Switcher */}
          {onToggleViewMode && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                id="btn-mode-stakeholder"
                onClick={() => onToggleViewMode('stakeholder')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  isStakeholder
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista limpia para Partes Interesadas: Oculta controles técnicos y muestra solo el resumen final"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Partes Interesadas</span>
              </button>
              <button
                type="button"
                id="btn-mode-admin"
                onClick={() => onToggleViewMode('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  !isStakeholder
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de Administración: Controles de modelo IA, prompts, reglas TPM y entrada de requerimientos"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Administración</span>
              </button>
            </div>
          )}

          {/* Welcome Guide Trigger */}
          <button
            type="button"
            id="btn-open-welcome"
            onClick={onOpenWelcome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer"
            title="Ver qué hace la aplicación y guía de bienvenida"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold">¿Cómo funciona?</span>
          </button>

          {/* ADMINISTRATION & CONFIGURATION CONTROLS: Only visible in admin mode */}
          {!isStakeholder && (
            <>
              {/* Model Status & Settings Pill */}
              <button
                type="button"
                id="btn-model-settings-pill"
                onClick={onOpenSettings}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-700 transition-colors cursor-pointer"
                title="Ajustar parámetros del modelo (Administración)"
              >
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="font-medium text-slate-800 truncate max-w-[120px] sm:max-w-none">
                  {displayModel}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-mono">Temp: {temperature}</span>
              </button>

              {/* Benchmark Sample Loader */}
              <button
                type="button"
                id="btn-load-sample"
                onClick={onLoadTurneroSample}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Cargar ejemplo Turnero con resolución automática (Administración)"
              >
                <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ejemplo Turnero</span>
              </button>

              {/* System Instructions / TPM Rules */}
              <button
                type="button"
                id="btn-system-instructions"
                onClick={onOpenInstructions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                title="Ver las 6 reglas de procesamiento del Senior TPM (Configuración)"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Reglas TPM</span>
              </button>

              {/* Raw JSON Download (Developer / Admin only) */}
              {hasProposal && onExportJson && (
                <button
                  type="button"
                  id="btn-quick-export-json"
                  onClick={onExportJson}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Descargar la propuesta completa en formato JSON puro (Admin)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              )}
            </>
          )}

          {/* Stakeholder and General Fast Action: Download Excel .xlsx */}
          {hasProposal && (onExportHitosXlsx || onExportHitosCsv) && (
            <button
              type="button"
              id="btn-quick-export-xlsx"
              onClick={onExportHitosXlsx || onExportHitosCsv}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Descargar Hitos y tareas en formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Hitos (.xlsx)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
