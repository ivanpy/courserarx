import 'server-only';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPool } from '@/lib/db/client';
import { obtenerProyecto } from '@/lib/db/proyectos';
import { obtenerPropuesta, obtenerUltimaPropuestaIdDeProyecto } from '@/lib/db/propuestas';

interface PageProps {
  params: Promise<{ proyectoId: string }>;
}

/**
 * Solo-admin (ya lo garantiza (admin)/layout.tsx). Muestra `metadata_json`
 * tal cual quedó persistido — incluye `promptUtilizado` (Resolución de
 * arquitectura de la Fase 7: snapshot de trazabilidad, ver
 * lib/db/propuestas.ts), nunca expuesto por /api/motor (SEC-02).
 */
export default async function DiagnosticoPage({ params }: PageProps) {
  const { proyectoId } = await params;
  const pool = getPool();
  const proyecto = await obtenerProyecto(pool, proyectoId);
  if (!proyecto) notFound();

  const propuestaId = await obtenerUltimaPropuestaIdDeProyecto(pool, proyectoId);
  const propuesta = propuestaId ? await obtenerPropuesta(pool, propuestaId) : null;

  return (
    <div className="space-y-4">
      <Link href={`/tpm/proyectos/${proyectoId}`} className="text-xs text-slate-400 hover:text-slate-700">
        ← {proyecto.nombre}
      </Link>
      <h1 className="text-xl font-semibold text-slate-900">Diagnóstico técnico</h1>

      {!propuesta ? (
        <p className="text-sm text-slate-500">Sin propuesta generada todavía.</p>
      ) : (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-900 p-4 text-xs text-slate-200">
          {JSON.stringify(propuesta.metadataJson, null, 2)}
        </pre>
      )}
    </div>
  );
}
