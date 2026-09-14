export interface Tarea {
  titulo: string;
  descripcion: string;
  rol: 'Fullstack' | 'Frontend' | 'Backend' | 'DevOps' | 'QA' | 'UI/UX' | string;
  horas: number;
}

export interface Hito {
  nombre_meta: string;
  tareas: Tarea[];
}

export interface SugerenciaProactiva {
  titulo: string;
  descripcion: string;
  impacto?: 'Alto' | 'Medio' | 'Bajo' | string;
}

export interface ExtraOpcional {
  titulo: string;
  descripcion: string;
  horas_estimadas?: number;
  origen_detectado?: string;
}

export interface AlertaConflicto {
  titulo: string;
  descripcion: string;
  fuente_imagen?: string;
  fuente_texto?: string;
  recomendacion?: string;
}

export interface ProposalResult {
  resumen_ejecutivo: string;
  hitos: Hito[];
  sugerencias_proactivas: SugerenciaProactiva[] | string[];
  extras_opcionales: ExtraOpcional[] | string[];
  alertas_conflictos: AlertaConflicto[] | string[];
  horas_totales_validadas: number;
  metadata?: {
    proyecto: string;
    fechaGeneracion: string;
    modeloUsado: string;
    cantidadImagenes: number;
    autoResolvedFallback?: boolean;
    resolucionAutomatica?: string | null;
  };
}

export interface ReviewableError {
  title: string;
  message: string;
  details?: string;
  status?: number;
  errorType?: 'KNOWN_RATE_LIMIT_OR_DEMAND' | 'UNHANDLED_ERROR' | 'NETWORK_ERROR' | string;
  timestamp: string;
  triedModels?: string[];
  raw?: any;
}

export interface UploadedImage {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 data url for preview and API payload
  thumbnail?: string;
}

export interface AnalysisRequestPayload {
  projectName: string;
  notes: string;
  images: {
    name: string;
    mimeType: string;
    base64Data: string;
  }[];
  systemInstructions?: string;
  temperature?: number;
  model?: string;
}
