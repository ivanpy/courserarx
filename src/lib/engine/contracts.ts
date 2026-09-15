/**
 * MotorInput / MotorOutput / MotorErrorPublico — el contrato del motor.
 *
 * `MotorInputSchema` es el contrato de HOY, no el de VAL-01 final (README
 * §9): sigue aceptando `systemInstructions`, `model` y `temperature` sin
 * acotar desde el cliente porque D-01, D-02 y D-03 siguen abiertos a
 * propósito. Cerrarlos — reemplazar esos tres campos por `promptProfileId` +
 * `modeloId` (enum) — es la Fase 2, y depende de infraestructura que todavía
 * no existe (sesión de Admin, tabla `proyectos`). Lo que sí se adelanta aquí
 * es el principio de VAL-01: la validación vive DENTRO del motor, no en el
 * Route Handler ni en el adaptador Express, y las claves desconocidas se
 * rechazan (`.strict()`) en vez de ignorarse.
 */
import {z} from 'zod';

export const MotorInputSchema = z
  .object({
    projectName: z.string().trim().max(200).optional(),
    notes: z
      .string()
      .trim()
      .min(1, "Las notas o análisis preliminar son obligatorios para establecer la 'Verdad Maestra' (Master Truth)."),
    images: z
      .array(
        z
          .object({
            name: z.string().optional(),
            mimeType: z.string().optional(),
            base64Data: z.string().optional(),
          })
          .passthrough()
      )
      .optional()
      .default([]),
    systemInstructions: z.string().optional(),
    temperature: z.number().optional(),
    model: z.string().optional(),
  })
  .strict();

export type MotorInput = z.infer<typeof MotorInputSchema>;

export interface MotorOutputMetadata {
  proyecto: string;
  fechaGeneracion: string;
  modeloUsado: string;
  modeloOriginal: string;
  autoResolvedFallback: boolean;
  resolucionAutomatica: string | null;
  cantidadImagenes: number;
  requestId: string;
  riesgoInjection: string;
}

/**
 * La forma de `hitos`/`sugerencias_proactivas`/etc. no se retipa aquí:
 * `parse.ts` la deja tal como la entrega el modelo bajo `RESPONSE_SCHEMA`, y
 * la re-validación Zod de esa forma (VAL-07 / INV-01..07) es la Fase 3.
 */
export interface MotorOutput {
  resumen_ejecutivo: string;
  hitos: unknown[];
  sugerencias_proactivas: unknown[];
  extras_opcionales: unknown[];
  alertas_conflictos: unknown[];
  horas_totales_validadas: number;
  metadata: MotorOutputMetadata;
}

export type {MotorErrorPublico} from './errors';
