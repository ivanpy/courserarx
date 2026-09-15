import 'server-only';
import type { Pool, PoolClient } from 'pg';

type Consultable = Pool | PoolClient;

export interface DatosProyecto {
  nombre: string;
  descripcionNotas?: string | null;
  systemInstructions?: string | null;
  modeloIa?: string;
  temperatura?: number;
}

export async function insertarProyecto(client: PoolClient, proyecto: DatosProyecto): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
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
  return rows[0].id;
}

export interface ProyectoConfig {
  id: string;
  nombre: string;
  descripcionNotas: string | null;
  systemInstructions: string | null;
  modeloIa: string;
  temperatura: number;
}

/** Config necesaria para (re)analizar: prompt efectivo, modelo y temperatura autorizados (VAL-02/VAL-03). */
export async function obtenerProyecto(db: Consultable, proyectoId: string): Promise<ProyectoConfig | null> {
  const { rows } = await db.query(
    `SELECT id, nombre, descripcion_notas, system_instructions, modelo_ia, temperatura::float AS temperatura
     FROM proyectos WHERE id = $1`,
    [proyectoId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    descripcionNotas: row.descripcion_notas,
    systemInstructions: row.system_instructions,
    modeloIa: row.modelo_ia,
    temperatura: row.temperatura,
  };
}

export interface ProyectoResumen {
  id: string;
  nombre: string;
  createdAt: string;
  cantidadPropuestas: number;
}

export async function listarProyectos(db: Consultable): Promise<ProyectoResumen[]> {
  const { rows } = await db.query(
    `SELECT p.id, p.nombre, p.created_at, count(pr.id)::int AS cantidad_propuestas
     FROM proyectos p LEFT JOIN propuestas pr ON pr.proyecto_id = p.id
     GROUP BY p.id ORDER BY p.created_at DESC`
  );
  return rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    createdAt: r.created_at,
    cantidadPropuestas: r.cantidad_propuestas,
  }));
}

async function actualizarProyectoOFallar(
  client: PoolClient,
  proyectoId: string,
  sql: string,
  valores: unknown[]
): Promise<void> {
  const { rowCount } = await client.query(sql, valores);
  if (rowCount === 0) {
    throw new Error(`Proyecto ${proyectoId} no encontrado.`);
  }
}

export async function actualizarPrompt(client: PoolClient, proyectoId: string, systemInstructions: string): Promise<void> {
  await actualizarProyectoOFallar(
    client,
    proyectoId,
    `UPDATE proyectos SET system_instructions = $2, updated_at = now() WHERE id = $1`,
    [proyectoId, systemInstructions]
  );
}

export async function actualizarPerfilInferencia(
  client: PoolClient,
  proyectoId: string,
  modeloIa: string,
  temperatura: number
): Promise<void> {
  await actualizarProyectoOFallar(
    client,
    proyectoId,
    `UPDATE proyectos SET modelo_ia = $2, temperatura = $3, updated_at = now() WHERE id = $1`,
    [proyectoId, modeloIa, temperatura]
  );
}
