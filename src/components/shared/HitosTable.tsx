import type { HitoPersistido, TarifaAplicadaPersistida } from '@/lib/db/propuestas';

interface HitosTableProps {
  hitos: HitoPersistido[];
  tarifasAplicadas: TarifaAplicadaPersistida[];
  moneda: string;
}

/**
 * Server Component puro (README §componentes compartidos): sin JS de
 * negocio del lado cliente. El costo se calcula acá, no en `tarifas` — se
 * matchea contra la FOTO HISTÓRICA (`propuesta_tarifas_aplicadas`), nunca
 * se resuelve de nuevo (database-schema.md §3: editar una tarifa después no
 * puede alterar lo ya cotizado).
 */
export function HitosTable({ hitos, tarifasAplicadas, moneda }: HitosTableProps) {
  if (hitos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Ninguna tarea coincide con los filtros aplicados.
      </p>
    );
  }

  const tarifaPorClave = new Map(tarifasAplicadas.map(t => [`${t.rol}::${t.seniority}`, t.montoHora]));
  const costoTarea = (rol: string, seniority: string, horas: number) =>
    horas * (tarifaPorClave.get(`${rol}::${seniority}`) ?? 0);

  return (
    <div className="space-y-4">
      {hitos.map(hito => {
        const horasHito = hito.tareas.reduce((sum, t) => sum + t.horas, 0);
        const costoHito = hito.tareas.reduce((sum, t) => sum + costoTarea(t.rol, t.seniority, t.horas), 0);

        return (
          <div key={hito.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-slate-800">{hito.nombreMeta}</h3>
              <span className="font-mono text-xs text-slate-500">
                {horasHito}h · {moneda} {costoHito.toFixed(2)}
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="px-4 py-2 text-left font-medium">Tarea</th>
                  <th className="px-2 py-2 text-left font-medium">Rol</th>
                  <th className="px-2 py-2 text-left font-medium">Seniority</th>
                  <th className="px-2 py-2 text-right font-medium">Horas</th>
                  <th className="px-4 py-2 text-right font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {hito.tareas.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 align-top text-slate-700">
                      <p className="font-medium">{t.titulo}</p>
                      {t.descripcion && <p className="mt-0.5 text-slate-400">{t.descripcion}</p>}
                    </td>
                    <td className="px-2 py-2 align-top text-slate-600">{t.rol}</td>
                    <td className="px-2 py-2 align-top text-slate-600">
                      {t.seniority}
                      {t.seniorityOrigen === 'manual' && <span className="ml-1 text-[10px] text-indigo-500">(manual)</span>}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-mono text-slate-700">{t.horas}</td>
                    <td className="px-4 py-2 text-right align-top font-mono text-slate-700">
                      {costoTarea(t.rol, t.seniority, t.horas).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
