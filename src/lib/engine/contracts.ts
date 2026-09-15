import 'server-only';

/**
 * MotorInput / MotorOutput / MotorErrorPublico — el contrato del motor.
 *
 * Fase 2 (VAL-01/02/03, cierra D-01, D-02, D-03): `systemInstructions`
 * desaparece del schema — el cliente ya no puede enviarla, ni para
 * overridearla ni de ningún otro modo (`.strict()` rechaza la clave si
 * llega). `model` pasa de string libre a un enum cerrado
 * (`MODELOS_PERMITIDOS`). `temperature` se acota a `[0, 0.4]`.
 *
 * Todavía no es el `MotorInput` final de VAL-01: no hay `promptProfileId`
 * (implicaría resolver el prompt por proyecto desde DB, Fase 6) ni sesión de
 * Admin que lo autorice (Fase 5). Lo que sí queda cerrado ya, sin depender de
 * esa infraestructura, es que ningún caller puede alterar Master Truth ni
 * Scope Isolation: el único texto de sistema posible es el literal de
 * `system-instruction.ts`.
 */
import {z} from 'zod';
import {MODELOS_PERMITIDOS, MODELO_DEFAULT} from './models';

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
    temperature: z.number().min(0).max(0.4).optional(),
    model: z.enum(MODELOS_PERMITIDOS).optional().default(MODELO_DEFAULT),
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
