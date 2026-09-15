/**
 * Pipeline de Tailwind v4 para Next.js.
 *
 * El árbol Vite legacy NO usa este archivo: compila Tailwind con el plugin
 * `@tailwindcss/vite`. Para que Vite no cargue esta config del raíz y procese
 * Tailwind dos veces, `vite.config.ts` fija una config de PostCSS vacía inline.
 * Ambos pipelines desaparecen al cerrar la Fase 10.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
