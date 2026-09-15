import type {NextConfig} from 'next';

/**
 * Fase 0 del plan de migración (README §14): andamiaje del monolito Next.js.
 *
 * `serverExternalPackages` mantiene estos paquetes fuera del bundling del servidor:
 * ambos son estrictamente server-only y ninguno debe acabar nunca en un chunk de
 * cliente (SEC-01, SEC-02). El SDK de Gemini además usa APIs de Node que no
 * sobreviven al empaquetado.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/genai', 'write-excel-file'],
};

export default nextConfig;
