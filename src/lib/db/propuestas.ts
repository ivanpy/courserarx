import 'server-only';
import type { Pool, PoolClient } from 'pg';
import type { MotorOutput } from '../engine';
import { resolverTarifa, type Moneda, type TarifaResuelta } from './tarifas';
import { obtenerSeniorityPorDefecto, resolverSeniorityDefault } from './seniority';

/** Tanto Pool como PoolClient sirven para lecturas — no necesitan transacción. */
type Consultable = Pool | PoolClient;

export interface DatosProyecto {
  nombre: string;
  descripcionNotas?: string | null;
  systemInstructions?: string | null;
  modeloIa?: string;
  temperatura?: number;
}

export interface DatosPropuesta {
  monedaCotizacion: Moneda;
  tipoCambioUsdArs?: number | null;
  tipoCambioFecha?: string | null;
  capacidadSemanalHoras?: number;
  fechaInicioProyectada?: string | null;
}

export interface PropuestaGuardada {
  proyectoId: string;
  propuestaId: string;
}

/**
 * Persiste una propuesta completa y toda su descendencia. El llamador (la
 * Server Action en lib/actions/propuestas.ts) es responsable de resolver la
 * sesión de Admin ANTES de invocar esto (SEC-03) y de envolver la llamada en
 * `withTransaction` (README §11: una propuesta parcialmente persistida
 * corrompería los totales del panel ejecutivo).
 *
 * `resultado.horas_totales_validadas` ya viene recalculado por
 * `recalcularHorasTotales()` (INV-02, parse.ts) y `rol`/`impacto` ya vienen
 * corregidos por `aplicarInvariantesSuaves()` (INV-01/03/05) — este módulo no
 * repite esas validaciones, confía en el motor y deja que los CHECK de la DB
 * sean la última red de seguridad.
 */
export async function crearPropuesta(
  client: PoolClient,
  proyecto: DatosProyecto,
  datosPropuesta: DatosPropuesta,
  resultado: MotorOutput
): Promise<PropuestaGuardada> {
  const { rows: proyectoRows } = await client.query<{ id: string }>(
    `INSERT INTO proyectos (nombre, descripcion_notas, system_instructions, modelo_ia, temperatura)
     VALUES ($1, $2, $3, COALESCE($4, 'gemini-3.5-flash'), COALESCE($5, 0.10))
     RETURNING id`,
    [
      proyecto.nombre,
      proyecto.descripcionNotas ?? null,
      proyecto.systemInstructions ?? null,
      proyecto.modeloIa ?? null,
      proyecto.temperatura ?? null,
    ]
  );
  const proyectoId = proyectoRows[0].id;

  const { rows: propuestaRows } = await client.query<{ id: string }>(
    `INSERT INTO propuestas (
       proyecto_id, resumen_ejecutivo, horas_totales_validadas, moneda_cotizacion,
       tipo_cambio_usd_ars, tipo_cambio_fecha, capacidad_semanal_horas,
       fecha_inicio_proyectada, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 40), $8, $9)
     RETURNING id`,
    [
      proyectoId,
      resultado.resumen_ejecutivo,
      resultado.horas_totales_validadas,
      datosPropuesta.monedaCotizacion,
      datosPropuesta.tipoCambioUsdArs ?? null,
      datosPropuesta.tipoCambioFecha ?? null,
      datosPropuesta.capacidadSemanalHoras ?? null,
      datosPropuesta.fechaInicioProyectada ?? null,
      JSON.stringify(resultado.metadata),
    ]
  );
  const propuestaId = propuestaRows[0].id;

  const seniorityPorDefecto = await obtenerSeniorityPorDefecto(client);
  const tarifasResueltas = new Map<string, TarifaResuelta>();

  for (const [ordenHito, hito] of resultado.hitos.entries()) {
    const { rows: hitoRows } = await client.query<{ id: string }>(
      `INSERT INTO hitos (propuesta_id, orden, nombre_meta) VALUES ($1, $2, $3) RETURNING id`,
      [propuestaId, ordenHito, hito.nombre_meta]
    );
    const hitoId = hitoRows[0].id;

    for (const [ordenTarea, tarea] of hito.tareas.entries()) {
      const seniority = resolverSeniorityDefault(seniorityPorDefecto, tarea.rol);

      await client.query(
        `INSERT INTO tareas (hito_id, orden, titulo, descripcion, rol, seniority, seniority_origen, horas)
         VALUES ($1, $2, $3, $4, $5, $6, 'default', $7)`,
        [hitoId, ordenTarea, tarea.titulo, tarea.descripcion, tarea.rol, seniority, tarea.horas]
      );

      const claveTarifa = `${tarea.rol}::${seniority}`;
      if (!tarifasResueltas.has(claveTarifa)) {
        const tarifa = await resolverTarifa(client, {
          rol: tarea.rol,
          seniority,
          monedaCotizacion: datosPropuesta.monedaCotizacion,
          tipoCambioUsdArs: datosPropuesta.tipoCambioUsdArs ?? null,
        });
        tarifasResueltas.set(claveTarifa, tarifa);
      }
    }
  }

  for (const [clave, tarifa] of tarifasResueltas) {
    const [rol, seniority] = clave.split('::');
    await client.query(
      `INSERT INTO propuesta_tarifas_aplicadas (propuesta_id, rol, seniority, moneda, monto_hora, tarifa_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [propuestaId, rol, seniority, tarifa.moneda, tarifa.montoHora, tarifa.tarifaId]
    );
  }

  for (const alerta of resultado.alertas_conflictos) {
    await client.query(
      `INSERT INTO alertas_conflictos (propuesta_id, titulo, descripcion, fuente_imagen, fuente_texto, recomendacion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        propuestaId,
        alerta.titulo,
        alerta.descripcion,
        alerta.fuente_imagen ?? null,
        alerta.fuente_texto ?? null,
        alerta.recomendacion ?? null,
      ]
    );
  }

  for (const extra of resultado.extras_opcionales) {
    // INV-01 ya garantiza 0 horas en el motor; acá se escribe el literal 0
    // directamente en vez de reenviar el campo, porque es una constante de
    // negocio (un "extra opcional" es por definición 0 horas), no un valor
    // que dependa de la respuesta del modelo.
    await client.query(
      `INSERT INTO extras_opcionales (propuesta_id, titulo, descripcion, horas_estimadas, origen_detectado)
       VALUES ($1, $2, $3, 0, $4)`,
      [propuestaId, extra.titulo, extra.descripcion, extra.origen_detectado ?? null]
    );
  }

  for (const sugerencia of resultado.sugerencias_proactivas) {
    await client.query(
      `INSERT INTO sugerencias_proactivas (propuesta_id, titulo, descripcion, impacto)
       VALUES ($1, $2, $3, $4)`,
      [propuestaId, sugerencia.titulo, sugerencia.descripcion, sugerencia.impacto ?? null]
    );
  }

  return { proyectoId, propuestaId };
}

export interface TareaPersistida {
  id: string;
  orden: number;
  titulo: string;
  descripcion: string | null;
  rol: string;
  seniority: string;
  seniorityOrigen: 'default' | 'manual';
  horas: number;
}

export interface HitoPersistido {
  id: string;
  orden: number;
  nombreMeta: string;
  tareas: TareaPersistida[];
}

export interface TarifaAplicadaPersistida {
  rol: string;
  seniority: string;
  moneda: Moneda;
  montoHora: number;
  tarifaId: string | null;
}

export interface AlertaConflictoPersistida {
  id: string;
  titulo: string;
  descripcion: string | null;
  fuenteImagen: string | null;
  fuenteTexto: string | null;
  recomendacion: string | null;
  resuelto: boolean;
  resolucionAplicada: string | null;
}

export interface ExtraOpcionalPersistido {
  id: string;
  titulo: string;
  descripcion: string | null;
  horasEstimadas: number;
  origenDetectado: string | null;
  aprobadoPorCliente: boolean;
}

export interface SugerenciaProactivaPersistida {
  id: string;
  titulo: string;
  descripcion: string | null;
  impacto: string | null;
  incorporado: boolean;
}

export interface PropuestaCompleta {
  id: string;
  proyectoId: string;
  resumenEjecutivo: string | null;
  horasTotalesValidadas: number;
  monedaCotizacion: Moneda;
  tipoCambioUsdArs: number | null;
  tipoCambioFecha: string | null;
  capacidadSemanalHoras: number;
  fechaInicioProyectada: string | null;
  metadataJson: unknown;
  createdAt: string;
  hitos: HitoPersistido[];
  tarifasAplicadas: TarifaAplicadaPersistida[];
  alertasConflictos: AlertaConflictoPersistida[];
  extrasOpcionales: ExtraOpcionalPersistido[];
  sugerenciasProactivas: SugerenciaProactivaPersistida[];
}

/**
 * Reconstruye una propuesta completa desde sus 7 tablas descendientes
 * (README §11). `tarifasAplicadas` viene de `propuesta_tarifas_aplicadas`,
 * nunca resuelto de nuevo contra `tarifas` — es la foto histórica, por eso
 * editar una tarifa después no puede cambiar lo que esto devuelve.
 */
export async function obtenerPropuesta(db: Consultable, propuestaId: string): Promise<PropuestaCompleta | null> {
  const { rows: propuestaRows } = await db.query(
    `SELECT id, proyecto_id, resumen_ejecutivo, horas_totales_validadas::float AS horas_totales_validadas,
            moneda_cotizacion, tipo_cambio_usd_ars::float AS tipo_cambio_usd_ars, tipo_cambio_fecha,
            capacidad_semanal_horas, fecha_inicio_proyectada, metadata_json, created_at
     FROM propuestas WHERE id = $1`,
    [propuestaId]
  );
  const propuesta = propuestaRows[0];
  if (!propuesta) return null;

  const { rows: hitoRows } = await db.query(
    `SELECT id, orden, nombre_meta FROM hitos WHERE propuesta_id = $1 ORDER BY orden`,
    [propuestaId]
  );

  const { rows: tareaRows } = await db.query(
    `SELECT t.id, t.hito_id, t.orden, t.titulo, t.descripcion, t.rol, t.seniority,
            t.seniority_origen, t.horas::float AS horas
     FROM tareas t JOIN hitos h ON h.id = t.hito_id
     WHERE h.propuesta_id = $1 ORDER BY h.orden, t.orden`,
    [propuestaId]
  );

  const tareasPorHito = new Map<string, TareaPersistida[]>();
  for (const t of tareaRows) {
    const lista = tareasPorHito.get(t.hito_id) ?? [];
    lista.push({
      id: t.id,
      orden: t.orden,
      titulo: t.titulo,
      descripcion: t.descripcion,
      rol: t.rol,
      seniority: t.seniority,
      seniorityOrigen: t.seniority_origen,
      horas: t.horas,
    });
    tareasPorHito.set(t.hito_id, lista);
  }

  const hitos: HitoPersistido[] = hitoRows.map(h => ({
    id: h.id,
    orden: h.orden,
    nombreMeta: h.nombre_meta,
    tareas: tareasPorHito.get(h.id) ?? [],
  }));

  const { rows: tarifaRows } = await db.query(
    `SELECT rol, seniority, moneda, monto_hora::float AS monto_hora, tarifa_id
     FROM propuesta_tarifas_aplicadas WHERE propuesta_id = $1`,
    [propuestaId]
  );
  const tarifasAplicadas: TarifaAplicadaPersistida[] = tarifaRows.map(r => ({
    rol: r.rol,
    seniority: r.seniority,
    moneda: r.moneda,
    montoHora: r.monto_hora,
    tarifaId: r.tarifa_id,
  }));

  const { rows: alertaRows } = await db.query(
    `SELECT id, titulo, descripcion, fuente_imagen, fuente_texto, recomendacion, resuelto, resolucion_aplicada
     FROM alertas_conflictos WHERE propuesta_id = $1`,
    [propuestaId]
  );
  const alertasConflictos: AlertaConflictoPersistida[] = alertaRows.map(r => ({
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    fuenteImagen: r.fuente_imagen,
    fuenteTexto: r.fuente_texto,
    recomendacion: r.recomendacion,
    resuelto: r.resuelto,
    resolucionAplicada: r.resolucion_aplicada,
  }));

  const { rows: extraRows } = await db.query(
    `SELECT id, titulo, descripcion, horas_estimadas::float AS horas_estimadas, origen_detectado, aprobado_por_cliente
     FROM extras_opcionales WHERE propuesta_id = $1`,
    [propuestaId]
  );
  const extrasOpcionales: ExtraOpcionalPersistido[] = extraRows.map(r => ({
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    horasEstimadas: r.horas_estimadas,
    origenDetectado: r.origen_detectado,
    aprobadoPorCliente: r.aprobado_por_cliente,
  }));

  const { rows: sugerenciaRows } = await db.query(
    `SELECT id, titulo, descripcion, impacto, incorporado
     FROM sugerencias_proactivas WHERE propuesta_id = $1`,
    [propuestaId]
  );
  const sugerenciasProactivas: SugerenciaProactivaPersistida[] = sugerenciaRows.map(r => ({
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    impacto: r.impacto,
    incorporado: r.incorporado,
  }));

  return {
    id: propuesta.id,
    proyectoId: propuesta.proyecto_id,
    resumenEjecutivo: propuesta.resumen_ejecutivo,
    horasTotalesValidadas: propuesta.horas_totales_validadas,
    monedaCotizacion: propuesta.moneda_cotizacion,
    tipoCambioUsdArs: propuesta.tipo_cambio_usd_ars,
    tipoCambioFecha: propuesta.tipo_cambio_fecha,
    capacidadSemanalHoras: propuesta.capacidad_semanal_horas,
    fechaInicioProyectada: propuesta.fecha_inicio_proyectada,
    metadataJson: propuesta.metadata_json,
    createdAt: propuesta.created_at,
    hitos,
    tarifasAplicadas,
    alertasConflictos,
    extrasOpcionales,
    sugerenciasProactivas,
  };
}
