import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProjectInputForm } from './components/ProjectInputForm';
import { ProposalDashboard } from './components/ProposalDashboard';
import { SystemInstructionsModal } from './components/SystemInstructionsModal';
import { ModelSettingsModal } from './components/ModelSettingsModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ErrorReviewModal } from './components/ErrorReviewModal';
import { WelcomeModal } from './components/WelcomeModal';
import { ProposalResult, UploadedImage, ReviewableError, ModeloPublico } from './types';
import { downloadJsonFile, exportHitosCsv, exportHitosXlsx } from './utils/helpers';
import { TURNERO_SAMPLE_DATA } from './data/defaults';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  PlayCircle,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Briefcase,
  Download,
  FileSpreadsheet,
  Users,
  Settings2
} from 'lucide-react';

export default function App() {
  const [projectName, setProjectName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [proposal, setProposal] = useState<ProposalResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewableError, setReviewableError] = useState<ReviewableError | null>(null);
  const [autoResolvedNotice, setAutoResolvedNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stakeholder' | 'admin'>('stakeholder');

  // Modals state
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    return localStorage.getItem('backlog_ia_welcome_seen') !== 'true';
  });

  // Model settings state. El prompt del sistema ya no es estado de cliente
  // (Fase 2, cierra D-01/D-12): el servidor lo resuelve internamente y no
  // acepta override. `modelos` llega del DTO ModeloPublico (/api/modelos),
  // única fuente de verdad sobre qué modelos son seleccionables.
  const [model, setModel] = useState<string>('gemini-3.5-flash');
  const [temperature, setTemperature] = useState<number>(0.1);
  const [modelos, setModelos] = useState<ModeloPublico[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/modelos')
      .then(res => res.json())
      .then(data => {
        if (!cancelado && Array.isArray(data.modelos)) {
          setModelos(data.modelos);
        }
      })
      .catch(() => {
        // Sin catálogo no se bloquea la app: el <select> queda deshabilitado
        // y el modelo por defecto ('gemini-3.5-flash') sigue siendo válido
        // contra el allowlist del servidor.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Load Turnero Benchmark Sample with automatic resolution
  const handleLoadTurneroSample = () => {
    setProjectName(TURNERO_SAMPLE_DATA.projectName);
    setNotes(TURNERO_SAMPLE_DATA.notes);

    // Guaranteed safe data URLs without canvas dependencies or iframe CSP hangs
    const sampleImgs: UploadedImage[] = TURNERO_SAMPLE_DATA.mockSampleImages.map(item => ({
      id: item.id,
      name: item.name,
      size: item.svgData.length,
      type: 'image/svg+xml',
      dataUrl: item.dataUrl
    }));

    setImages(sampleImgs);
    setProposal(TURNERO_SAMPLE_DATA.expectedDemoResult);
    setViewMode('stakeholder');
    setErrorMessage(null);
    setReviewableError(null);
    setAutoResolvedNotice(
      'Caso Turnero cargado con resolución automática: Se identificaron 3 contradicciones entre capturas y especificaciones (Sucursales, Duración de 15m a 30m, CUIL vs DNI), resolviéndose bajo la Regla de Prioridad de la Verdad.'
    );
  };

  const handleReset = () => {
    setProjectName('');
    setNotes('');
    setImages([]);
    setProposal(null);
    setErrorMessage(null);
    setReviewableError(null);
    setAutoResolvedNotice(null);
  };

  // Run Real Analysis via backend API with automatic error resolution & user review
  const handleAnalyze = async () => {
    if (!notes.trim()) {
      setErrorMessage('Por favor ingresa las notas o análisis preliminar.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setReviewableError(null);
    setAutoResolvedNotice(null);

    try {
      // Prepare payload with base64 images
      const preparedImages = images.map(img => ({
        name: img.name,
        mimeType: img.type,
        base64Data: img.dataUrl
      }));

      // Fase 2 (cierra D-08): ya no hay cascada de reintento con otro modelo
      // acá. El servidor ya agota su propia cascada de fallback en una sola
      // petición (src/lib/engine/inference.ts) — reintentar en el navegador
      // con el primer modelo de esa misma cascada era resiliencia duplicada
      // ejecutándose en zona no confiable, y ya redundante en la práctica.
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectName: projectName.trim() || 'Proyecto de Software',
          notes: notes.trim(),
          images: preparedImages,
          temperature,
          model
        })
      });
      const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor.' }));

      if (!res.ok) {
        // "si es otro error dejame revisarlo"
        // Present unclassified or persistent errors in the review modal
        const unhandledErr: ReviewableError = {
          title: data.isRateLimitOrDemand
            ? 'Límite de Cuota o Demanda en la API'
            : 'Error en la Generación de la Propuesta',
          message: data.error || data.rawMessage || 'Ocurrió un error inesperado al invocar el servicio de IA.',
          details: data.details,
          status: res.status,
          errorType: data.errorType || (data.isRateLimitOrDemand ? 'KNOWN_RATE_LIMIT_OR_DEMAND' : 'UNHANDLED_ERROR'),
          timestamp: data.timestamp || new Date().toISOString(),
          triedModels: data.triedModels || [model],
          raw: data
        };
        setReviewableError(unhandledErr);
        return;
      }

      if (data.metadata?.autoResolvedFallback && !autoResolvedNotice) {
        setAutoResolvedNotice(
          data.metadata.resolucionAutomatica ||
            'Se resolvió automáticamente: La propuesta fue completada utilizando un modelo alternativo disponible.'
        );
      }

      setProposal(data);
      setViewMode('stakeholder');
    } catch (err: any) {
      console.error('Error al generar propuesta:', err);
      // Client-side exception or network drop: "si es otro error dejame revisarlo"
      setReviewableError({
        title: 'Error de Red o Comunicación',
        message: err.message || 'No se pudo establecer comunicación con el servidor de análisis.',
        details: err.stack || String(err),
        status: 0,
        errorType: 'CLIENT_NETWORK_EXCEPTION',
        timestamp: new Date().toISOString(),
        raw: err
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Bar */}
      <Header
        onOpenInstructions={() => setIsInstructionsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
        onLoadTurneroSample={handleLoadTurneroSample}
        isAnalyzing={isAnalyzing}
        model={model}
        temperature={temperature}
        hasProposal={!!proposal}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onExportJson={() => {
          if (proposal) {
            const fileName = `propuesta_${proposal.metadata?.proyecto?.toLowerCase().replace(/\s+/g, '_') || 'backlog'}.json`;
            downloadJsonFile(proposal, fileName);
          }
        }}
        onExportHitosCsv={() => {
          if (proposal) {
            exportHitosCsv(proposal);
          }
        }}
        onExportHitosXlsx={() => {
          if (proposal) {
            exportHitosXlsx(proposal);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Automatic Resolution Notification Banner */}
        {autoResolvedNotice && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-emerald-950">
                  Resolución Automática Aplicada
                </span>
                <span className="text-emerald-800 leading-relaxed block">
                  {autoResolvedNotice}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoResolvedNotice(null)}
              className="text-emerald-600 hover:text-emerald-900 p-1.5 cursor-pointer text-xs font-semibold shrink-0"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification Banner if any */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-900 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-rose-950">Aviso del Asistente IA</span>
                <span className="text-rose-800 leading-relaxed block">{errorMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {model !== 'gemini-3.5-flash' && (
                <button
                  type="button"
                  onClick={() => {
                    setModel('gemini-3.5-flash');
                    setErrorMessage(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer text-[11px]"
                >
                  Cambiar a Gemini 3.5 Flash
                </button>
              )}
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-800 p-1.5 cursor-pointer text-xs font-semibold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stakeholder View (When proposal is ready and viewMode is stakeholder) */}
        {proposal && viewMode === 'stakeholder' ? (
          <div className="space-y-4">
            {/* Stakeholder Info Banner */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-sm sm:text-base text-white">
                      Vista para Partes Interesadas
                    </h2>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                      Resumen Final
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                    Controles de administración, configuración del modelo y prompts ocultos. Visualizando exclusivamente el resumen ejecutivo, hitos, fechas y presupuesto para toma de decisiones.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  id="btn-switch-admin-mode"
                  onClick={() => setViewMode('admin')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Abrir formulario de transcripciones, configuración del modelo de IA y controles técnicos"
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>Modo Administración / Editar</span>
                </button>
              </div>
            </div>

            {/* Proposal Dashboard in Full Width */}
            <ProposalDashboard proposal={proposal} isStakeholderView={true} />
          </div>
        ) : (
          /* Administration Mode or Initial Workspace */
          <div className="space-y-4">
            {proposal && viewMode === 'admin' && (
              <div className="bg-slate-200/90 border border-slate-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>
                    <strong>Modo Administración Activo:</strong> Puedes editar notas, transcripciones, subir capturas, cambiar parámetros del modelo o ver el JSON crudo.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('stakeholder')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Ver Vista Partes Interesadas</span>
                </button>
              </div>
            )}

            {/* 2-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Input Form (5 cols on lg) */}
              <div className="lg:col-span-5 space-y-4">
                <ProjectInputForm
                  projectName={projectName}
                  setProjectName={setProjectName}
                  notes={notes}
                  setNotes={setNotes}
                  images={images}
                  setImages={setImages}
                  onAnalyze={handleAnalyze}
                  onReset={handleReset}
                  isAnalyzing={isAnalyzing}
                  onPreviewImage={setPreviewImage}
                />

                {/* Processing Rules Quick Reminder Card */}
                <div className="bg-white/80 rounded-xl border border-slate-200 p-4 space-y-2 text-xs text-slate-700 shadow-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Reglas de Negocio del Senior TPM
                  </div>
                  <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-700">
                    <li>
                      <strong className="text-slate-900">Master Truth:</strong> El texto manda sobre las imágenes.
                    </li>
                    <li>
                      <strong className="text-slate-900">Aislamiento de Alcance:</strong> Funciones en fotos no pedidas van a <em>extras_opcionales</em> con 0 horas.
                    </li>
                    <li>
                      <strong className="text-slate-900">Desglose Atómico:</strong> Tareas técnicas ejecutables (DB, backend, UI).
                    </li>
                    <li>
                      <strong className="text-slate-900">Gaps y Conflictos:</strong> Detección de procesos omitidos y contradicciones.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Output Proposal & Backlog (7 cols on lg) */}
              <div className="lg:col-span-7">
                {proposal ? (
                  <ProposalDashboard proposal={proposal} isStakeholderView={false} />
                ) : (
                  /* Empty State / Welcome Guide */
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 flex flex-col justify-center min-h-[500px]">
                    {/* Header Welcome Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 pb-4 border-b border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-1">
                          Constructor de backlog.ia
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                          Bienvenido al Constructor de backlog.ia una herramienta que te va a ayudar con la gestión de proyectos
                        </h3>
                      </div>
                    </div>

                    {/* 4 Feature Pillars Grid */}
                    <div className="grid sm:grid-cols-2 gap-3 text-left">
                      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Desglose de reuniones
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Desglosa las transcripciones de reuniones sobre las necesidades del cliente y extrae requisitos concretos.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Subida de bocetos
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Permite subir capturas de pantalla de bocetos y wireframes para contrastarlos contra lo pedido.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Backlog y Horas
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Construye el backlog con hitos, tareas atómicas, perfiles técnicos y estimaciones de horas validadas.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Resumen para Gerencia
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Elabora un resumen ejecutivo listo para directores, stakeholders y presentación de presupuestos.
                        </p>
                      </div>
                    </div>

                    {/* Downloads Notice */}
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-xs text-indigo-950 font-medium">
                          <strong>Exportaciones directas:</strong> Descarga tu presupuesto en <strong>JSON</strong> o descarga los <strong>hitos en Excel (.xlsx)</strong> con títulos en negrita.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsWelcomeOpen(true)}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 shrink-0 cursor-pointer"
                      >
                        Ver Guía Completa
                      </button>
                    </div>

                    {/* Interactive Sample Trigger */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        ¿Quieres ver un ejemplo en acción?
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Carga el caso de prueba del <strong>"Turnero Clínico"</strong> con notas reales de cliente, bocetos analizados y backlog desglosado con horas y contradicciones resueltas.
                      </p>
                      <button
                        type="button"
                        id="btn-quick-sample-turnero"
                        onClick={handleLoadTurneroSample}
                        disabled={isAnalyzing}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        title="Cargar Caso de Prueba Turnero (Autoresuelto)"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Cargar Caso de Prueba "Turnero" (Autoresuelto)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Welcome Guide Modal for First-time and Return Users */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onLoadSample={handleLoadTurneroSample}
      />

      {/* System Instructions Modal (solo lectura desde la Fase 2) */}
      <SystemInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      {/* Model Settings Modal */}
      <ModelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        model={model}
        setModel={setModel}
        temperature={temperature}
        setTemperature={setTemperature}
        modelos={modelos}
      />

      {/* Full-size Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Unhandled / Reviewable Error Modal ("si es otro error déjame revisarlo") */}
      {reviewableError && (
        <ErrorReviewModal
          error={reviewableError}
          onClose={() => setReviewableError(null)}
          onRetry={handleAnalyze}
        />
      )}
    </div>
  );
}
