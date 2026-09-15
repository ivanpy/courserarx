export type NivelRiesgo = 'minimo' | 'controlado' | 'atencion';

/** Umbral de gobernanza sobre alertas_conflictos. La etiqueta y el color son presentación de la UI. */
export function nivelRiesgo(conflictos: number): NivelRiesgo {
  if (conflictos > 3) return 'atencion';
  if (conflictos > 0) return 'controlado';
  return 'minimo';
}
