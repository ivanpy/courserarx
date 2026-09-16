import type {Metadata} from 'next';
import './globals.css';

// Server Component. No debe contener NADA de cliente: es la raíz por la que pasa
// todo el árbol, y cualquier 'use client' aquí arrastraría la app entera al bundle
// del navegador (README §3.2, §4.2).

export const metadata: Metadata = {
  title: 'Constructor de backlog.ia',
  description:
    'Transforma notas, transcripciones y bocetos de cliente en una propuesta técnica con estimación de horas, backlog atómico y vista ejecutiva.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning solo en <body>, no recursivo: extensiones del
          navegador (gestores de contraseña, temas oscuros, Grammarly) suelen
          inyectar atributos acá antes de que React hidrate — falso positivo
          documentado en los docs de Next, no oculta mismatches reales del árbol. */}
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
