import 'server-only';

/**
 * MotorInput / MotorOutputData / MotorOutput / MotorErrorPublico — el
 * contrato del motor.
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
 *
 * Fase 3 (SEC-05, cierra D-06): `notes` y `images` quedan acotados en tamaño
 * y cantidad. Los topes de bytes por adjunto/petición (5MB/20MB) no se
 * expresan aquí — decodificar cada `base64Data` solo para medirlo no es
 * trabajo de E0; ese chequeo vive en `ingest.ts` (E1), sobre bytes reales.
 */
import {z} from 'zod';
import {MODELOS_PERMITIDOS, MODELO_DEFAULT} from './models';

export const MotorInputSchema = z
  .object({
    projectName: z.string().trim().max(200).optional(),
    notes: z
      .string()
      .trim()
      .min(1, "Las notas o análisis preliminar son obligatorios para establecer la 'Verdad Maestra' (Master Truth).")
      .max(100_000, 'Las notas superan el máximo de 100 000 caracteres.'),
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
      .max(8, 'Se admiten hasta 8 adjuntos por petición.')
      .optional()
      .default([]),
    temperature: z.number().min(0).max(0.4).optional(),
    model: z.enum(MODELOS_PERMITIDOS).optional().default(MODELO_DEFAULT),
  })
  .strict();

export type MotorInput = z.infer<typeof MotorInputSchema>;

/**
 * VAL-07 + INV-04 + INV-06 (Fase 3, cierra D-07 junto con RES-06 en
 * inference.ts): la forma exacta que debe tener la salida del modelo para
 * aceptarse, más allá de lo que ya fuerza `RESPONSE_SCHEMA` del lado de
 * Gemini — un `responseMimeType`/`responseSchema` no es garantía de
 * cumplimiento real.
 *
 * `rol` e `impacto` quedan como `string` sueltos a propósito: su dominio se
 * corrige (no se rechaza) en `invariants.ts` — INV-03 reasigna un rol
 * inválido a 'Otro', INV-05 normaliza un impacto inválido a 'Medio'. Un
 * `.safeParse()` fallido contra este schema es la señal de "reintentar con
 * el siguiente modelo de la cascada" (RES-06); solo puede fallar por una
 * forma verdaderamente irrecuperable: falta un campo requerido, `horas`
 * fuera de `(0, 120]` (INV-04), o `hitos`/`tareas` vacíos (INV-06).
 */
const TareaSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    rol: z.string().min(1),
    horas: z.number().gt(0).max(120),
  })
  .strict();

const HitoSchema = z
  .object({
    nombre_meta: z.string().min(1),
    tareas: z.array(TareaSchema).min(1),
  })
  .strict();

const SugerenciaProactivaSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    impacto: z.string().optional(),
  })
  .strict();

const ExtraOpcionalSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    horas_estimadas: z.number().optional(),
    origen_detectado: z.string().optional(),
  })
  .strict();

const AlertaConflictoSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    fuente_imagen: z.string().optional(),
    fuente_texto: z.string().optional(),
    recomendacion: z.string().optional(),
  })
  .strict();

export const MotorOutputDataSchema = z
  .object({
    resumen_ejecutivo: z.string().min(1),
    hitos: z.array(HitoSchema).min(1),
    sugerencias_proactivas: z.array(SugerenciaProactivaSchema),
    extras_opcionales: z.array(ExtraOpcionalSchema),
    alertas_conflictos: z.array(AlertaConflictoSchema),
    // El valor del modelo no es autoritativo: recalcularHorasTotales()
    // (parse.ts, INV-02) siempre lo pisa. Se valida solo el tipo.
    horas_totales_validadas: z.number(),
  })
  .strict();

export type MotorOutputData = z.infer<typeof MotorOutputDataSchema>;

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
  /** Cuántos intentos (modelo × reintento) tomó la cascada hasta el éxito. RES-10. */
  intentosCascada: number;
  /** Qué corrigió invariants.ts y por qué — auditable por el TPM. INV-01/03/05. */
  correccionesInvariantes: string[];
}

export interface MotorOutput extends MotorOutputData {
  metadata: MotorOutputMetadata;
}

export type {MotorErrorPublico} from './errors';
