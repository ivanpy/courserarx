'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearProyecto, analizarProyecto } from '@/app/(admin)/tpm/nuevo/actions';
import { ErrorReviewPanel } from './ErrorReviewPanel';
import type { MotorErrorPublico } from '@/types';

interface ImagenCargada {
  id: string;
  name: string;
  mimeType: string;
  /** data URL para rasterizadas, texto XML crudo para SVG (E2 acepta ambos formatos). */
  payload: string;
  previewUrl: string;
  kind: 'raster' | 'svg';
}

const MIME_RASTER_ADMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGENES = 8;

function esSvg(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

/** SVG se lee como texto (no base64): E2 (clasificarYSanearAdjunto) acepta XML crudo directamente. */
async function procesarArchivo(file: File): Promise<ImagenCargada | null> {
  if (esSvg(file)) {
    const texto = await file.text();
    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mimeType: 'image/svg+xml',
      payload: texto,
      previewUrl: URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' })),
      kind: 'svg',
    };
  }

  if (!MIME_RASTER_ADMITIDOS.has(file.type)) return null;

  const dataUrl = await leerComoDataUrl(file);
  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    mimeType: file.type,
    payload: dataUrl,
    previewUrl: dataUrl,
    kind: 'raster',
  };
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
 * README §árbol final: "File/FileReader/drag&drop/useRef". Sin storage real
 * (lib/db/adjuntos.ts): las mismas imágenes que se leen acá se mandan DOS
 * veces al servidor — una en crearProyecto (persiste metadata + SVGs) y otra
 * en analizarProyecto (el motor las necesita frescas, nunca se releen de la
 * DB). `proyectoId` se guarda en estado apenas crearProyecto resuelve, para
 * que un reintento tras un MotorError no duplique el proyecto.
 */
export function ProjectIntakeForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState('');
  const [notas, setNotas] = useState('');
  const [imagenes, setImagenes] = useState<ImagenCargada[]>([]);
  const [archivosRechazados, setArchivosRechazados] = useState<string[]>([]);
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<MotorErrorPublico | null>(null);

  const puedeEnviar = nombre.trim().length > 0 && notas.trim().length > 0 && !procesando;

  const agregarArchivos = async (files: File[]) => {
    const espacioDisponible = MAX_IMAGENES - imagenes.length;
    const aProcesar = files.slice(0, Math.max(espacioDisponible, 0));
    const rechazadosPorCupo = files.slice(aProcesar.length).map(f => f.name);

    const resultados = await Promise.all(aProcesar.map(procesarArchivo));
    const nuevas: ImagenCargada[] = [];
    const rechazadosPorTipo: string[] = [];
    resultados.forEach((img, idx) => {
      if (img) nuevas.push(img);
      else rechazadosPorTipo.push(aProcesar[idx].name);
    });

    setImagenes(prev => [...prev, ...nuevas]);
    const rechazados = [...rechazadosPorTipo, ...rechazadosPorCupo];
    setArchivosRechazados(rechazados);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await agregarArchivos(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) await agregarArchivos(Array.from(e.dataTransfer.files));
  };

  const removeImage = (id: string) => {
    setImagenes(prev => {
      const img = prev.find(i => i.id === id);
      if (img?.kind === 'svg') URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const limpiar = () => {
    imagenes.forEach(img => {
      if (img.kind === 'svg') URL.revokeObjectURL(img.previewUrl);
    });
    setNombre('');
    setNotas('');
    setImagenes([]);
    setArchivosRechazados([]);
    setProyectoId(null);
    setError(null);
  };

  const ejecutarAnalisis = async () => {
    setError(null);
    setProcesando(true);
    try {
      const payloadImagenes = imagenes.map(img => ({ name: img.name, mimeType: img.mimeType, base64Data: img.payload }));

      let idProyecto = proyectoId;
      if (!idProyecto) {
        const creado = await crearProyecto({ nombre, notas, imagenes: payloadImagenes });
        idProyecto = creado.proyectoId;
        setProyectoId(idProyecto);
      }

      const resultado = await analizarProyecto({ proyectoId: idProyecto, notes: notas, images: payloadImagenes });
      if (!resultado.ok) {
        setError(resultado.error);
        setProcesando(false);
        return;
      }

      router.push(`/tpm/proyectos/${idProyecto}`);
    } catch {
      setError(errorGenerico('Ocurrió un error inesperado al generar la propuesta. Verificá tu conexión e intentá de nuevo.'));
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-widest">Nuevo proyecto</h2>
            <p className="text-xs text-slate-600 mt-1">
              Las notas mandan sobre las imágenes. Lo que no esté en el texto es referencia estética.
            </p>
          </div>
          {(nombre || notas || imagenes.length > 0) && (
            <button
              type="button"
              onClick={limpiar}
              disabled={procesando}
              className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              Limpiar
            </button>
          )}
        </div>

        <div>
          <label htmlFor="input-nombre" className="block text-xs uppercase font-bold text-slate-400 tracking-widest mb-1.5">
            Nombre del proyecto
          </label>
          <input
            id="input-nombre"
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="ej: Sistema de Turnos Sucursal Única (Turnero)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="input-notas" className="block text-xs uppercase font-bold text-slate-400 tracking-widest">
              Notas y alcance (Master Truth)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">{notas.length} chars</span>
          </div>
          <textarea
            id="input-notas"
            rows={8}
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Pegá todo lo que hablaste con el cliente: restricciones críticas, decisiones técnicas, exclusiones explícitas…"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono leading-relaxed"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-widest">
              Referencias visuales ({imagenes.length}/{MAX_IMAGENES})
            </label>
            {imagenes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  imagenes.forEach(img => img.kind === 'svg' && URL.revokeObjectURL(img.previewUrl));
                  setImagenes([]);
                }}
                className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                Borrar todas
              </button>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => imagenes.length < MAX_IMAGENES && fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs font-semibold text-slate-700">
              Hacé clic o arrastrá capturas, bocetos o mockups
            </p>
            <p className="text-[11px] text-slate-400">PNG, JPG, WEBP o SVG — hasta {MAX_IMAGENES} archivos</p>
          </div>

          {archivosRechazados.length > 0 && (
            <p className="mt-1.5 text-[11px] text-amber-700">
              No admitido/omitido: {archivosRechazados.join(', ')} (solo PNG, JPG, WEBP o SVG, hasta {MAX_IMAGENES}).
            </p>
          )}

          {imagenes.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {imagenes.map((img, idx) => (
                <div key={img.id} className="group relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-1.5 flex items-center justify-between text-[11px] bg-white border-t border-slate-100">
                    <span className="truncate max-w-[100px] text-slate-700 font-medium" title={img.name}>
                      {idx + 1}. {img.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={ejecutarAnalisis}
          disabled={!puedeEnviar}
          className={`w-full py-3 px-4 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer ${
            !puedeEnviar ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {procesando ? 'Consultando Senior TPM con Gemini…' : 'Generar propuesta y backlog técnico'}
        </button>
      </div>

      {error && <ErrorReviewPanel error={error} onDismiss={() => setError(null)} onRetry={ejecutarAnalisis} />}
    </div>
  );
}
