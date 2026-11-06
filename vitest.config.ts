import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Test-only binding, applied before each test by test/setup.ts.
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations('migrations'),
          // Test-only sign-in settings. Tests never use real GitHub credentials.
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
          ALLOWED_GITHUB_IDS: '1001',
          PUBLIC_URL: 'http://localhost',
        },
      },
    })),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'istanbul',
      include: ['src/domain/**/*.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 90,
        branches: 90,
      },
    },
  },
});
