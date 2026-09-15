import { Type } from '@google/genai';

/**
 * Esquema forzado del SDK para la salida del motor (§5.3, §6).
 *
 * Rescatado y consolidado desde dos fuentes que hoy conviven divergentes:
 * server.ts:211-303 (el que corre en producción, con `description` en cada
 * campo) y src/services/geminiService.ts:4-87 (código muerto, sin
 * descriptions). Esta pasa a ser la única versión: server.ts y el nuevo
 * Route Handler la importan de aquí. geminiService.ts queda huérfano por
 * este cambio; la Fase 2 lo borra formalmente (README §4.3).
 */
export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resumen_ejecutivo: {
      type: Type.STRING,
      description:
        'Texto narrativo profesional para el cliente resumiendo el alcance, arquitectura y decisiones clave.',
    },
    hitos: {
      type: Type.ARRAY,
      description: 'Lista de hitos del proyecto con sus respectivas tareas técnicas atómicas.',
      items: {
        type: Type.OBJECT,
        properties: {
          nombre_meta: {type: Type.STRING},
          tareas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                titulo: {type: Type.STRING},
                descripcion: {type: Type.STRING},
                rol: {
                  type: Type.STRING,
                  description: 'Perfil técnico recomendado: Fullstack, Frontend, Backend, DevOps, QA, etc.',
                },
                horas: {
                  type: Type.NUMBER,
                  description: 'Estimación de horas de esfuerzo para esta tarea específica.',
                },
              },
              required: ['titulo', 'descripcion', 'rol', 'horas'],
            },
          },
        },
        required: ['nombre_meta', 'tareas'],
      },
    },
    sugerencias_proactivas: {
      type: Type.ARRAY,
      description: 'Procesos omitidos o gaps detectados por el consultor (anulaciones, emails, logs, etc.).',
      items: {
        type: Type.OBJECT,
        properties: {
          titulo: {type: Type.STRING},
          descripcion: {type: Type.STRING},
          impacto: {type: Type.STRING},
        },
        required: ['titulo', 'descripcion'],
      },
    },
    extras_opcionales: {
      type: Type.ARRAY,
      description: 'Funciones presentes en las imágenes que NO fueron pedidas en el texto (0 horas estimadas).',
      items: {
        type: Type.OBJECT,
        properties: {
          titulo: {type: Type.STRING},
          descripcion: {type: Type.STRING},
          horas_estimadas: {type: Type.NUMBER},
          origen_detectado: {type: Type.STRING},
        },
        required: ['titulo', 'descripcion'],
      },
    },
    alertas_conflictos: {
      type: Type.ARRAY,
      description: 'Contradicciones evidentes detectadas entre las capturas/bocetos y las notas de texto.',
      items: {
        type: Type.OBJECT,
        properties: {
          titulo: {type: Type.STRING},
          descripcion: {type: Type.STRING},
          fuente_imagen: {type: Type.STRING},
          fuente_texto: {type: Type.STRING},
          recomendacion: {type: Type.STRING},
        },
        required: ['titulo', 'descripcion'],
      },
    },
    horas_totales_validadas: {
      type: Type.NUMBER,
      description: 'Suma total de horas únicamente de tareas validadas por el texto.',
    },
  },
  required: [
    'resumen_ejecutivo',
    'hitos',
    'sugerencias_proactivas',
    'extras_opcionales',
    'alertas_conflictos',
    'horas_totales_validadas',
  ],
};
