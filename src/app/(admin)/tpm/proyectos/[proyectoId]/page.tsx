import 'server-only';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPool } from '@/lib/db/client';
import { obtenerProyecto } from '@/lib/db/proyectos';
import { obtenerPropuesta, obtenerUltimaPropuestaIdDeProyecto, type TareaPersistida } from '@/lib/db/propuestas';
import { PromptEditor } from '@/components/admin/PromptEditor';
import { ModelProfileSelector } from '@/components/admin/ModelProfileSelector';
import { BacklogFilters } from '@/components/admin/BacklogFilters';
import { ReanalizarButton } from '@/components/admin/ReanalizarButton';
import { AlertaResolverForm } from '@/components/admin/AlertaResolverForm';
import { HitosTable } from '@/components/shared/HitosTable';

interface PageProps {
  params: Promise<{ proyectoId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function comoTexto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === 'string' && valor.length > 0 ? valor : undefined;
}

function coincideTarea(
  tarea: TareaPersistida,
  criterios: { rol?: string; seniority?: string; q?: string }
): boolean {
  if (criterios.rol && tarea.rol !== criterios.rol) return false;
  if (criterios.seniority && tarea.seniority !== criterios.seniority) return false;
  if (criterios.q && !tarea.titulo.toLowerCase().includes(criterios.q.toLowerCase())) return false;
  return true;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function ProyectoPage({ params, searchParams }: PageProps) {
  const { proyectoId } = await params;
  const sp = await searchParams;
  const criterios = {
    rol: comoTexto(sp.rol),
    seniority: comoTexto(sp.seniority),
    q: comoTexto(sp.q),
  };

  const pool = getPool();
  const proyecto = await obtenerProyecto(pool, proyectoId);
  if (!proyecto) notFound();

  const propuestaId = await obtenerUltimaPropuestaIdDeProyecto(pool, proyectoId);
  const propuesta = propuestaId ? await obtenerPropuesta(pool, propuestaId) : null;

  const rolesDisponibles = propuesta
    ? Array.from(new Set(propuesta.hitos.flatMap(h => h.tareas.map(t => t.rol))))
    : [];

  const hitosFiltrados = propuesta
    ? propuesta.hitos
        .map(h => ({ ...h, tareas: h.tareas.filter(t => coincideTarea(t, criterios)) }))
        .filter(h => h.tareas.length > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/tpm" className="text-xs text-slate-400 hover:text-slate-700">
            ← Proyectos
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{proyecto.nombre}</h1>
        </div>
        <ReanalizarButton proyectoId={proyectoId} tieneNotas={Boolean(proyecto.descripcionNotas)} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <ModelProfileSelector proyectoId={proyectoId} modeloActual={proyecto.modeloIa} />
        <PromptEditor proyectoId={proyectoId} initialValue={proyecto.systemInstructions} />
      </section>

      {!propuesta && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Todavía no se generó ninguna propuesta para este proyecto.
        </p>
      )}

      {propuesta && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Horas totales validadas" value={`${propuesta.horasTotalesValidadas} h`} />
            <MetricCard label="Hitos" value={String(propuesta.hitos.length)} />
            <MetricCard label="Alertas de conflicto" value={String(propuesta.alertasConflictos.length)} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Resumen ejecutivo</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{propuesta.resumenEjecutivo}</p>
          </section>

          <section className="space-y-3">
            <Suspense fallback={null}>
              <BacklogFilters rolesDisponibles={rolesDisponibles} />
            </Suspense>
            <HitosTable hitos={hitosFiltrados} tarifasAplicadas={propuesta.tarifasAplicadas} moneda={propuesta.monedaCotizacion} />
          </section>

          {propuesta.alertasConflictos.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Alertas de conflicto</h2>
              {propuesta.alertasConflictos.map(a => (
                <div key={a.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm">
                  <p className="font-semibold text-amber-900">{a.titulo}</p>
                  {a.descripcion && <p className="mt-1 text-xs text-amber-800">{a.descripcion}</p>}
                  {a.recomendacion && <p className="mt-1 text-xs text-amber-700">Recomendación: {a.recomendacion}</p>}
                  {a.resuelto ? (
                    <p className="mt-2 text-xs text-emerald-700">Resuelta: {a.resolucionAplicada}</p>
                  ) : (
                    <AlertaResolverForm alertaId={a.id} />
                  )}
                </div>
              ))}
            </section>
          )}

          {propuesta.extrasOpcionales.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Extras opcionales (0 horas — Scope Isolation)
              </h2>
              {propuesta.extrasOpcionales.map(e => (
                <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-medium text-slate-800">{e.titulo}</p>
                  {e.descripcion && <p className="mt-1 text-xs text-slate-500">{e.descripcion}</p>}
                  {e.origenDetectado && <p className="mt-1 text-[11px] text-slate-400">Detectado en: {e.origenDetectado}</p>}
                </div>
              ))}
            </section>
          )}

          {propuesta.sugerenciasProactivas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Sugerencias proactivas</h2>
              {propuesta.sugerenciasProactivas.map(s => (
                <div key={s.id} className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-sm">
                  <p className="font-medium text-indigo-900">
                    {s.titulo} {s.impacto && <span className="text-[11px] font-normal text-indigo-500">· Impacto {s.impacto}</span>}
                  </p>
                  {s.descripcion && <p className="mt-1 text-xs text-indigo-700">{s.descripcion}</p>}
                </div>
              ))}
            </section>
          )}

          <Link
            href={`/tpm/proyectos/${proyectoId}/diagnostico`}
            className="inline-block text-xs text-indigo-600 hover:underline"
          >
            Ver diagnóstico técnico →
          </Link>
        </>
      )}
    </div>
  );
}
