/**
 * Slug seguro para nombres de archivo. Reemplaza TODO carácter no alfanumérico
 * (espacios, acentos, puntuación) en vez de solo espacios: un nombre de proyecto
 * con ':' o '?' rompería un nombre de archivo en Windows si solo se normalizaran espacios.
 */
export function proyectoSlug(nombre: string | undefined, fallback = 'proyecto'): string {
  const base = (nombre || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || fallback;
}
