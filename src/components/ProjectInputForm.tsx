import React, { useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  Eye,
  AlertCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { UploadedImage } from '../types';
import { fileToBase64 } from '../utils/helpers';

interface ProjectInputFormProps {
  projectName: string;
  setProjectName: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  onAnalyze: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
  onPreviewImage: (img: UploadedImage) => void;
}

export const ProjectInputForm: React.FC<ProjectInputFormProps> = ({
  projectName,
  setProjectName,
  notes,
  setNotes,
  images,
  setImages,
  onAnalyze,
  onReset,
  isAnalyzing,
  onPreviewImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    const newImgs: UploadedImage[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await fileToBase64(file);
        newImgs.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: dataUrl
        });
      } catch (err) {
        console.error('Error al leer archivo:', err);
      }
    }
    setImages(prev => [...prev, ...newImgs]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files) as File[];
      await processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
      {/* Section Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Input Sources &amp; Requerimientos
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Redacta las notas de la reunión y sube las capturas. Master Truth prioriza el texto.
          </p>
        </div>
        {(projectName || notes || images.length > 0) && (
          <button
            type="button"
            onClick={onReset}
            disabled={isAnalyzing}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Project Name Field */}
      <div>
        <label htmlFor="input-project-name" className="block text-xs uppercase font-bold text-slate-400 tracking-widest mb-1.5">
          Project Name / Contexto
        </label>
        <input
          id="input-project-name"
          type="text"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder="ej: Sistema de Turnos Sucursal Única (Turnero)"
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-white"
        />
      </div>

      {/* Master Truth Notes Field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="input-notes" className="block text-xs uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
            Meeting Notes &amp; Alcance
            <span className="text-[10px] normal-case font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.2 rounded">
              Master Truth
            </span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {notes.length} chars
          </span>
        </div>
        <textarea
          id="input-notes"
          rows={6}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Pega aquí todo lo que hablaste con el cliente, restricciones críticas, decisiones técnicas o exclusiones explícitas...&#10;&#10;Ejemplo: 'Necesito un sistema de turnos igual al de las fotos, pero solo para una sucursal y no quiero que pida el CUIL, solo el DNI. El cliente quiere que los turnos sean de 30 minutos obligatoriamente.'"
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono leading-relaxed bg-white"
        />
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs italic text-slate-600 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
          <span>
            <strong>Prioridad de Verdad:</strong> Todo lo redactado aquí anula las capturas. Las pantallas o componentes que no figuren en este texto se aislarán en "extras_opcionales" con 0 horas.
          </span>
        </div>
      </div>

      {/* Image Upload Zone */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
            Visual References ({images.length} {images.length === 1 ? 'file' : 'files'})
            <span className="text-[10px] normal-case font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
              Estética
            </span>
          </label>
          {images.length > 0 && (
            <button
              type="button"
              onClick={() => setImages([])}
              className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              Borrar todas
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          id="dropzone-screenshots"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <UploadCloud className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-700">
            Haz clic o arrastra capturas de pantalla, bocetos o mockups
          </p>
          <p className="text-[11px] text-slate-400">
            PNG, JPG, WEBP o diagramas (Gemini Multimodal Analysis)
          </p>
        </div>

        {/* Uploaded Images Grid */}
        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="p-1.5 flex items-center justify-between text-[11px] bg-white border-t border-slate-100">
                  <span className="truncate max-w-[100px] text-slate-700 font-medium" title={img.name}>
                    {idx + 1}. {img.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewImage(img);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                      title="Ver imagen en tamaño completo"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Eliminar captura"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit CTA Button */}
      <button
        type="button"
        id="btn-run-analysis"
        onClick={onAnalyze}
        disabled={isAnalyzing || !notes.trim()}
        className={`w-full py-3 px-4 rounded-lg text-xs sm:text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
          isAnalyzing || !notes.trim()
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-600/20'
        }`}
      >
        {isAnalyzing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>Consultando Senior TPM con Gemini...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Generar Propuesta y Backlog Técnico</span>
          </>
        )}
      </button>
    </div>
  );
};
