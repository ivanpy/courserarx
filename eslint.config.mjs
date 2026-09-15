import tsParser from '@typescript-eslint/parser';

/**
 * Frontera Admin/Stakeholder (README §4.2, Fase 5). Regla mínima y deliberada:
 * no se habilita ningún preset (next/react/typescript-eslint recommended) para
 * no introducir ruido de lint fuera del alcance de esta fase — el árbol legacy
 * Vite convive todavía con el monolito y se demuele recién en la Fase 10.
 */
const FRONTERA_STAKEHOLDER = {
  files: ['src/app/(stakeholder)/**/*.{ts,tsx}'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
    },
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/engine', '@/lib/engine/*'],
            message:
              'El motor (src/lib/engine) es server-only y nunca debe alcanzarse desde la vista Stakeholder (README §4.2, SEC-02).',
          },
          {
            group: ['@/components/admin', '@/components/admin/*'],
            message:
              'Los componentes de Admin/TPM no son alcanzables desde la vista Stakeholder (README §4.2).',
          },
        ],
      },
    ],
  },
};

export default [FRONTERA_STAKEHOLDER];
