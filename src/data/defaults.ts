import { ProposalResult } from '../types';

export const DEFAULT_SYSTEM_INSTRUCTIONS = `Actúa como un Senior Technical Product Manager y Arquitecto de Software Fullstack experto en metodologías Ágiles. Tu misión es transformar requerimientos caóticos (imágenes y notas) en una propuesta profesional y un backlog técnico.

REGLAS DE PROCESAMIENTO:
1. PRIORIDAD DE VERDAD (Master Truth): El texto proporcionado por el usuario manda sobre las imágenes. Si una imagen muestra algo que no está en el texto, considéralo 'Referencia Estética' y no lo incluyas en el presupuesto base.
2. AISLAMIENTO DE ALCANCE: Solo asigna horas a tareas validadas por el texto. Si detectas funciones en las imágenes que NO fueron pedidas en el texto, lístalas en una sección aparte llamada 'extras_opcionales' con 0 horas.
3. DESGLOSE TÉCNICO DETALLADO: No generes tareas genéricas. Divide cada hito en pasos técnicos ejecutables (ej: 'Crear tabla de turnos en DB', 'Validar solapamiento de horarios en Backend', 'Desarrollar selector de fechas en Frontend').
4. DETECCIÓN DE GAPS (Modo Consultor): Identifica procesos omitidos (ej: anulaciones, confirmaciones por email, feriados) y lístalos en 'sugerencias_proactivas'.
5. ALERTAS DE CONFLICTO: Si hay una contradicción evidente entre una imagen y las notas, lístala en 'alertas_conflictos' y no asumas una solución.
6. ASIGNACIÓN DE ROLES: Sugiere el perfil técnico necesario (ej: Fullstack, DevOps, QA, Frontend, Backend) para cada tarea.

FORMATO DE SALIDA (JSON PURO):
Responde exclusivamente en formato JSON estructurado siguiendo el esquema solicitado.`;

export const TURNERO_SAMPLE_DATA = {
  projectName: "Sistema de Turnos Online (Turnero Monosucursal)",
  notes: `Necesito un sistema de turnos igual al diseño visual de las fotos adjuntas, pero con las siguientes especificaciones críticas de negocio:
1. Únicamente para UNA sucursal central (ignorar el selector multisucursal que aparece en los bocetos de las fotos).
2. Formulario de identificación del paciente: NO quiero que pida el CUIL/CUIT ni obra social obligatoria, solo el DNI (número) y teléfono celular para notificaciones.
3. Duración de los slots de turnos: Los turnos deben ser de 30 minutos obligatoriamente (en las capturas se observan intervalos de 15 minutos, pero nosotros requerimos bloques fijos de 30 min).
4. El paciente debe poder seleccionar profesional/especialidad, día y horario disponible, confirmar y recibir un código de reserva en pantalla.`,
  mockSampleImages: [
    {
      id: "img-turnero-1",
      name: "01_pantalla_identificacion_cuil.svg",
      title: "Boceto 1: Identificación (Pedía CUIL y Obra Social)",
      type: "image/svg+xml",
      // High-fidelity SVG wireframe rendered as data URI
      svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" style="background:#f8fafc; font-family:sans-serif;">
        <rect width="400" height="300" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="40" rx="8" fill="#1e293b"/>
        <text x="35" y="45" fill="#ffffff" font-size="14" font-weight="bold">Turnero Clínico - Paso 1: Identificación</text>
        <rect x="30" y="80" width="340" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
        <text x="42" y="102" fill="#64748b" font-size="12">Campo: CUIL / CUIT (11 dígitos)</text>
        <rect x="30" y="125" width="340" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
        <text x="42" y="147" fill="#64748b" font-size="12">Campo: DNI / Documento</text>
        <rect x="30" y="170" width="340" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
        <text x="42" y="192" fill="#64748b" font-size="12">Obra Social / Prepaga (Selector)</text>
        <rect x="30" y="225" width="340" height="40" rx="6" fill="#2563eb"/>
        <text x="160" y="250" fill="#ffffff" font-size="13" font-weight="bold">Continuar</text>
      </svg>`,
      get dataUrl() {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(this.svgData);
      }
    },
    {
      id: "img-turnero-2",
      name: "02_selector_sucursal_especialidad.svg",
      title: "Boceto 2: Selección Sucursal (Muestra 5 sedes) y Especialidad",
      type: "image/svg+xml",
      svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" style="background:#f8fafc; font-family:sans-serif;">
        <rect width="400" height="300" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="40" rx="8" fill="#1e293b"/>
        <text x="35" y="45" fill="#ffffff" font-size="14" font-weight="bold">Turnero Clínico - Paso 2: Ubicación &amp; Médico</text>
        <rect x="30" y="80" width="340" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
        <text x="42" y="102" fill="#ef4444" font-size="12">Selector: Sucursal (Belgrano, Pilar, Centro, Quilmes)</text>
        <rect x="30" y="125" width="340" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
        <text x="42" y="147" fill="#64748b" font-size="12">Especialidad: Odontología, Clínica Médica, Traumatología</text>
        <rect x="30" y="170" width="340" height="35" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
        <text x="42" y="192" fill="#64748b" font-size="12">Profesional asignado</text>
        <rect x="30" y="225" width="340" height="40" rx="6" fill="#2563eb"/>
        <text x="150" y="250" fill="#ffffff" font-size="13" font-weight="bold">Ver Horarios</text>
      </svg>`,
      get dataUrl() {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(this.svgData);
      }
    },
    {
      id: "img-turnero-3",
      name: "03_grilla_turnos_15min.svg",
      title: "Boceto 3: Grilla de Horarios (Muestra slots de 15 minutos)",
      type: "image/svg+xml",
      svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" style="background:#f8fafc; font-family:sans-serif;">
        <rect width="400" height="300" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="40" rx="8" fill="#1e293b"/>
        <text x="35" y="45" fill="#ffffff" font-size="14" font-weight="bold">Horarios Disponibles - 14 de Octubre</text>
        <!-- Grilla de botones de 15 minutos en la foto -->
        <rect x="30" y="75" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="43" y="95" font-size="11" fill="#334155">09:00</text>
        <rect x="110" y="75" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="123" y="95" font-size="11" fill="#334155">09:15</text>
        <rect x="190" y="75" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="203" y="95" font-size="11" fill="#334155">09:30</text>
        <rect x="270" y="75" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="283" y="95" font-size="11" fill="#334155">09:45</text>
        <rect x="30" y="115" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="43" y="135" font-size="11" fill="#334155">10:00</text>
        <rect x="110" y="115" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="123" y="135" font-size="11" fill="#334155">10:15</text>
        <rect x="190" y="115" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="203" y="135" font-size="11" fill="#334155">10:30</text>
        <rect x="270" y="115" width="70" height="30" rx="4" fill="#e2e8f0"/><text x="283" y="135" font-size="11" fill="#334155">10:45</text>
        <rect x="30" y="160" width="310" height="50" rx="6" fill="#fef3c7" stroke="#f59e0b"/>
        <text x="40" y="180" font-size="10" fill="#92400e">Conflicto visual detectado en captura: intervalos de 15 min</text>
        <text x="40" y="195" font-size="10" fill="#92400e">Requerimiento textual: bloques fijos de 30 minutos.</text>
        <rect x="30" y="235" width="340" height="40" rx="6" fill="#2563eb"/>
        <text x="140" y="260" fill="#ffffff" font-size="13" font-weight="bold">Confirmar Turno</text>
      </svg>`,
      get dataUrl() {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(this.svgData);
      }
    }
  ],
  expectedDemoResult: {
    resumen_ejecutivo: "Propuesta técnica para el desarrollo de un Sistema de Gestión de Turnos Web enfocado en una única sucursal física. Se adapta el flujo visual de referencia aislando el alcance estrictamente a lo validado por las notas del cliente: eliminación de la complejidad multisucursal, simplificación del onboarding mediante DNI único y parametrización estricta de turnos en intervalos de 30 minutos. La solución contempla una arquitectura modular en React + Node.js/PostgreSQL asegurando reserva sin solapamiento y código de confirmación inmediato.",
    hitos: [
      {
        nombre_meta: "Hito 1: Arquitectura de Datos y Motor de Reservas",
        tareas: [
          {
            titulo: "Diseño y migración de modelo relacional en base de datos",
            descripcion: "Crear tablas para profesionales, especialidades, turnos y pacientes vinculados por DNI. Omitir campo CUIL y tabla de sucursales según Master Truth.",
            rol: "Backend",
            horas: 8
          },
          {
            titulo: "Lógica de cálculo de slots de 30 minutos en Backend",
            descripcion: "Implementar algoritmo generador de intervalos horarios fijos de 30 minutos a partir del horario laboral del profesional, ignorando los slots de 15 min de las capturas.",
            rol: "Backend",
            horas: 6
          },
          {
            titulo: "Validación de concurrencia y prevención de solapamiento",
            descripcion: "Implementar locks optimistas/transaccionales en la reserva de turno para impedir que dos pacientes reserven el mismo intervalo simultáneamente.",
            rol: "Backend",
            horas: 7
          }
        ]
      },
      {
        nombre_meta: "Hito 2: Frontend y Experiencia de Usuario",
        tareas: [
          {
            titulo: "Formulario de identificación simplificado (DNI y Teléfono)",
            descripcion: "Desarrollar interfaz de registro rápido validando formato de DNI argentino y número de teléfono móvil. Omitir campos de CUIL y selector de obra social.",
            rol: "Frontend",
            horas: 5
          },
          {
            titulo: "Selector dinámico de especialidad y profesional",
            descripcion: "Construir selector en cascada para filtrar profesional y especialidad sin el paso previo de sucursales.",
            rol: "Frontend",
            horas: 6
          },
          {
            titulo: "Calendario y visualizador de slots de 30 minutos",
            descripcion: "Diseñar componente interactivo de selección de día y bloques de media hora con feedback de disponibilidad en tiempo real.",
            rol: "Frontend",
            horas: 8
          },
          {
            titulo: "Pantalla de confirmación con código alfanumérico",
            descripcion: "Renderizado de voucher digital con resumen del turno, fecha, hora, nombre del profesional y código único de reserva.",
            rol: "Frontend",
            horas: 4
          }
        ]
      },
      {
        nombre_meta: "Hito 3: Despliegue, Infraestructura y QA",
        tareas: [
          {
            titulo: "Configuración de entorno contenerizado y CI/CD",
            descripcion: "Setup de Docker, base de datos PostgreSQL en la nube, variables de entorno seguras y pipeline de despliegue automatizado.",
            rol: "DevOps",
            horas: 6
          },
          {
            titulo: "Suite de pruebas end-to-end de reserva y carga concurrente",
            descripcion: "Pruebas de solapamiento de turnos, validación de inputs de DNI y pruebas de estrés de reserva simultánea.",
            rol: "QA",
            horas: 6
          }
        ]
      }
    ],
    sugerencias_proactivas: [
      {
        titulo: "Proceso de Cancelación y Reprogramación por Token",
        descripcion: "El cliente no especificó cómo el usuario puede cancelar o cambiar su turno. Se sugiere enviar un enlace seguro por SMS/WhatsApp o permitir cancelación ingresando DNI + código.",
        impacto: "Alto"
      },
      {
        titulo: "Gestión de Feriados y Bloqueos de Agenda Médica",
        descripcion: "Falta definir el panel para que la secretaría o el médico bloquee días libres, ausencias por congresos o feriados nacionales sin generar turnos inválidos.",
        impacto: "Alto"
      },
      {
        titulo: "Notificaciones de Recordatorio (WhatsApp / SMS / Email)",
        descripcion: "Se recomienda enviar un recordatorio automatizado 24 horas antes del turno para reducir el índice de ausentismo (no-show).",
        impacto: "Medio"
      }
    ],
    extras_opcionales: [
      {
        titulo: "Módulo Multisucursal con geolocalización",
        descripcion: "Detectado en captura '02_selector_sucursal_especialidad.png' que mostraba sucursales Belgrano, Pilar y Centro. Descartado del presupuesto base por Master Truth (cliente solicitó monosucursal).",
        horas_estimadas: 0,
        origen_detectado: "Captura de pantalla 2 (Selector Sucursales)"
      },
      {
        titulo: "Módulo de Validación de Obra Social y Padrón de Prepaga",
        descripcion: "Detectado en captura '01_pantalla_identificacion_cuil.png' con dropdown de prepagas y verificación de carnet. No solicitado en notas.",
        horas_estimadas: 0,
        origen_detectado: "Captura de pantalla 1 (Formulario de afiliación)"
      },
      {
        titulo: "Integración con AFIP / ANSES para validación automática de CUIL",
        descripcion: "Detectado en captura inicial como campo requerido de 11 dígitos. Reemplazado por DNI simple.",
        horas_estimadas: 0,
        origen_detectado: "Captura de pantalla 1"
      }
    ],
    alertas_conflictos: [
      {
        titulo: "Conflicto en Intervalo de Duración de Turnos (15 min vs 30 min)",
        descripcion: "La captura de pantalla '03_grilla_turnos_15min.png' muestra slots en intervalos de 15 minutos (09:00, 09:15, 09:30). Las notas del cliente exigen estrictamente bloques fijos de 30 minutos.",
        fuente_imagen: "Captura 3 muestra grilla fraccionada cada 15 min",
        fuente_texto: "Nota: 'El cliente quiere que los turnos sean de 30 minutos obligatoriamente'",
        recomendacion: "Se aplicó Master Truth (30 min en el backlog base). Confirmar con el cliente si algún profesional atiende en 15 min."
      },
      {
        titulo: "Conflicto en Requisitos de Identificación (CUIL vs DNI)",
        descripcion: "La imagen '01_pantalla_identificacion_cuil.png' exige CUIL de 11 dígitos. La nota textual indica explícitamente prescindir de CUIL y requerir únicamente DNI.",
        fuente_imagen: "Captura 1 incluye campo obligatorio 'CUIL / CUIT'",
        fuente_texto: "Nota: 'no quiero que pida el CUIL, solo el DNI'",
        recomendacion: "Se modeló la base de datos con DNI como identificador. Validar si en el futuro necesitarán facturación electrónica fiscal que exija CUIL."
      },
      {
        titulo: "Conflicto en Arquitectura de Sucursales (Multisede vs Monosede)",
        descripcion: "El flujo gráfico contempla un selector de sucursal en el Paso 2. La nota define monosucursal.",
        fuente_imagen: "Captura 2 cuenta con selector de sedes",
        fuente_texto: "Nota: 'solo para una sucursal'",
        recomendacion: "Se aisló el módulo multisede a 'extras_opcionales' con 0 horas para no encarecer el proyecto."
      }
    ],
    horas_totales_validadas: 50
  } as ProposalResult
};
