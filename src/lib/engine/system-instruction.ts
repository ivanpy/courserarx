/**
 * E4 del pipeline — resuelve la instrucción de sistema efectiva.
 *
 * Fase 1: paridad con server.ts:161-171. El cliente todavía puede enviar
 * `systemInstructions` y pisar el default — D-01 sigue ABIERTO a propósito.
 * Cerrarlo es la Fase 2 (VAL-02): el cliente pasa a enviar un
 * `promptProfileId` y este módulo resuelve el texto desde
 * `proyectos.system_instructions` en DB, previa comprobación de sesión Admin.
 * Esa infraestructura (DB, sesión) todavía no existe, así que no se puede
 * adelantar sin construir sobre una frontera a medio cerrar.
 */
const DEFAULT_SYSTEM_INSTRUCTION = `Actúa como un Senior Technical Product Manager y Arquitecto de Software Fullstack experto en metodologías Ágiles. Tu misión es transformar requerimientos caóticos (imágenes y notas) en una propuesta profesional y un backlog técnico.

REGLAS DE PROCESAMIENTO:
1. PRIORIDAD DE VERDAD (Master Truth): El texto proporcionado por el usuario manda sobre las imágenes. Si una imagen muestra algo que no está en el texto, considéralo 'Referencia Estética' y no lo incluyas en el presupuesto base.
2. AISLAMIENTO DE ALCANCE: Solo asigna horas a tareas validadas por el texto. Si detectas funciones en las imágenes que NO fueron pedidas en el texto, lístalas en una sección aparte llamada 'extras_opcionales' con 0 horas.
3. DESGLOSE TÉCNICO DETALLADO: No generes tareas genéricas. Divide cada hito en pasos técnicos ejecutables (ej: 'Crear tabla de turnos en DB', 'Validar solapamiento de horarios en Backend', 'Desarrollar selector de fechas en Frontend').
4. DETECCIÓN DE GAPS (Modo Consultor): Identifica procesos omitidos (ej: anulaciones, confirmaciones por email, feriados) y lístalos en 'sugerencias_proactivas'.
5. ALERTAS DE CONFLICTO: Si hay una contradicción evidente entre una imagen y las notas, lístala en 'alertas_conflictos' y no asumas una solución.
6. ASIGNACIÓN DE ROLES: Sugiere el perfil técnico necesario (ej: Fullstack, DevOps, QA, Frontend, Backend) para cada tarea.

FORMATO DE SALIDA (JSON PURO): Responde exclusivamente con la estructura solicitada.`;

/**
 * Igual que server.ts:161 (`systemInstructions || DEFAULT...`): un string
 * vacío o solo espacios sigue contando como "sin override" únicamente si es
 * falsy — no se agrega un `.trim()` que server.ts nunca tuvo, para no
 * introducir una diferencia de comportamiento fuera del alcance de esta fase.
 */
export function resolverSystemInstruction(systemInstructionsDelCliente?: string): string {
  return systemInstructionsDelCliente || DEFAULT_SYSTEM_INSTRUCTION;
}
