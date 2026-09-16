import 'server-only';
import Link from 'next/link';
import { getPool } from '@/lib/db/client';
import { listarProyectos } from '@/lib/db/proyectos';

export default async function TpmPage() {
  const proyectos = await listarProyectos(getPool());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Proyectos</h1>
        <Link
          href="/tpm/nuevo"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          + Nuevo proyecto
        </Link>
      </div>

      {proyectos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Todavía no hay proyectos. Creá el primero.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {proyectos.map(p => (
            <Link
              key={p.id}
              href={`/tpm/proyectos/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                <p className="mt-0.5 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs text-slate-500">
                {p.cantidadPropuestas} {p.cantidadPropuestas === 1 ? 'propuesta' : 'propuestas'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
