'use client';

interface TpmErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/**
 * README: "mensaje redactado" — Next ya redacta `error.message` para errores
 * de Server Component en producción (solo queda `digest` para correlacionar
 * con el log), pero igual no se muestra ese campo acá: ni en dev debería
 * filtrarse detalle de infraestructura (ej. una excepción de `pg`) a la UI.
 */
export default function TpmError({ error, retry }: TpmErrorProps) {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <p className="text-sm font-semibold text-rose-600">Ocurrió un error inesperado.</p>
      <p className="text-xs text-slate-500">
        {error.digest ? `Código de referencia: ${error.digest}` : 'No se pudo completar la operación.'}
      </p>
      <button
        type="button"
        onClick={retry}
        className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
      >
        Reintentar
      </button>
    </div>
  );
}
