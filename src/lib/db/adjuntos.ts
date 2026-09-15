import 'server-only';
import type { Pool, PoolClient } from 'pg';

type Consultable = Pool | PoolClient;

export interface DatosAdjunto {
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes?: number | null;
  contenidoSvg?: string | null;
}

/**
 * No hay backend de storage real (sin S3/blob) — solo se persiste metadata
 * (nombre/mime/tamaño) y, para vectoriales, el texto del SVG (`contenido_svg`
 * ya existe para eso en el schema). Los bytes de una rasterizada no se
 * guardan en ningún lado: `analizarProyecto` los recibe directo del cliente
 * en la misma llamada donde todavía están en memoria; `reanalizarProyecto`
 * solo puede reconstruir SVGs + notas, no rasterizadas (decisión explícita,
 * no un descuido).
 */
export async function insertarAdjuntos(client: PoolClient, proyectoId: string, adjuntos: DatosAdjunto[]): Promise<void> {
  for (const adjunto of adjuntos) {
    await client.query(
      `INSERT INTO proyecto_adjuntos (proyecto_id, nombre_archivo, mime_type, tamano_bytes, contenido_svg)
       VALUES ($1, $2, $3, $4, $5)`,
      [proyectoId, adjunto.nombreArchivo, adjunto.mimeType, adjunto.tamanoBytes ?? null, adjunto.contenidoSvg ?? null]
    );
  }
}

export interface AdjuntoSvg {
  nombreArchivo: string;
  contenidoSvg: string;
}

export async function obtenerAdjuntosSvg(db: Consultable, proyectoId: string): Promise<AdjuntoSvg[]> {
  const { rows } = await db.query(
    `SELECT nombre_archivo, contenido_svg FROM proyecto_adjuntos
     WHERE proyecto_id = $1 AND contenido_svg IS NOT NULL`,
    [proyectoId]
  );
  return rows.map(r => ({ nombreArchivo: r.nombre_archivo, contenidoSvg: r.contenido_svg }));
}
