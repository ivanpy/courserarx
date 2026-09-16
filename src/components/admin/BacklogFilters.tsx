'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface BacklogFiltersProps {
  rolesDisponibles: string[];
}

const SENIORITIES = ['Junior', 'Semi', 'Senior'] as const;

/**
 * README §migración de ProposalDashboard: "Tabs y filtros pasan a
 * searchParams" — este componente no filtra nada por sí mismo, solo
 * sincroniza `?rol=&seniority=&q=` en la URL. El Server Component que la
 * hospeda (Paso 3) lee `searchParams` y filtra `hitos`/`tareas` en el
 * servidor, no en el cliente (CLAUDE.md §2: "JS de negocio ≈ 0" del lado
 * stakeholder/admin). Requiere que el host envuelva esta pieza en
 * <Suspense> (useSearchParams lo exige en App Router).
 */
export function BacklogFilters({ rolesDisponibles }: BacklogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const rolActual = searchParams.get('rol') ?? '';
  const seniorityActual = searchParams.get('seniority') ?? '';
  const textoActual = searchParams.get('q') ?? '';
  const hayFiltrosActivos = Boolean(rolActual || seniorityActual || textoActual);

  const actualizarParam = (clave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(clave, valor);
    } else {
      params.delete(clave);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <select
        value={rolActual}
        onChange={e => actualizarParam('rol', e.target.value)}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 bg-white cursor-pointer"
      >
        <option value="">Todos los roles</option>
        {rolesDisponibles.map(rol => (
          <option key={rol} value={rol}>
            {rol}
          </option>
        ))}
      </select>

      <select
        value={seniorityActual}
        onChange={e => actualizarParam('seniority', e.target.value)}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 bg-white cursor-pointer"
      >
        <option value="">Toda seniority</option>
        {SENIORITIES.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        type="search"
        defaultValue={textoActual}
        onChange={e => actualizarParam('q', e.target.value)}
        placeholder="Buscar por título de tarea…"
        className="flex-1 min-w-[160px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400"
      />

      {hayFiltrosActivos && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
          className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
