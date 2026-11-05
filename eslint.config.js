import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const LAYER_MESSAGE = 'Layer rule violation. See docs/ARCHITECTURE.md section 3.';

// Layers each src/ folder must not import. Mirrors docs/ARCHITECTURE.md section 3.
const FORBIDDEN_LAYERS = {
  domain: ['services', 'db', 'mcp', 'auth', 'playbook', 'env'],
  services: ['mcp', 'auth', 'playbook', 'env'],
  db: ['services', 'mcp', 'auth', 'playbook', 'env'],
  mcp: ['db', 'auth', 'env'],
  auth: ['domain', 'services', 'db', 'mcp', 'playbook'],
  playbook: ['services', 'db', 'mcp', 'auth', 'env'],
};

// Packages a layer must not import, as regular expressions.
const FORBIDDEN_PACKAGES = {
  domain: '^(?!\\.)',
  services: '^(zod|agents|@modelcontextprotocol/)',
};

const layerConfigs = Object.entries(FORBIDDEN_LAYERS).map(([layer, forbidden]) => {
  const patterns = [{ regex: `(^|/)(${forbidden.join('|')})(/|$)`, message: LAYER_MESSAGE }];
  const packages = FORBIDDEN_PACKAGES[layer];
  if (packages) {
    patterns.push({ regex: packages, message: LAYER_MESSAGE });
  }
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: { 'no-restricted-imports': ['error', { patterns }] },
  };
});

export default defineConfig(
  { ignores: ['node_modules/', 'coverage/', '.wrangler/', 'dist/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
  {
    files: ['*.config.ts'],
    rules: { 'no-restricted-exports': 'off' },
  },
  ...layerConfigs,
  prettierConfig,
);
