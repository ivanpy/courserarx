// Andamiaje de la Fase 0: página vacía cuyo único propósito es verificar que el
// build compila y que Tailwind se aplica. La Fase 5 la reemplaza por el
// redirect() según rol descrito en README §4.1.

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 px-6">
      <p className="text-sm font-medium tracking-widest text-sky-400 uppercase">
        Fase 0 — Andamiaje
      </p>
      <h1 className="text-3xl font-semibold text-balance">
        Constructor de backlog.ia
      </h1>
      <p className="text-slate-400">
        Monolito Next.js en construcción. El árbol Vite legacy sigue vivo en
        paralelo hasta la Fase 10.
      </p>
    </main>
  );
}
