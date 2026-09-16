import 'server-only';
import Link from 'next/link';
import { ProjectIntakeForm } from '@/components/admin/ProjectIntakeForm';

export default function NuevoProyectoPage() {
  return (
    <div className="space-y-4">
      <Link href="/tpm" className="text-xs text-slate-400 hover:text-slate-700">
        ← Proyectos
      </Link>
      <h1 className="text-xl font-semibold text-slate-900">Nuevo proyecto</h1>
      <ProjectIntakeForm />
    </div>
  );
}
