import type { applyD1Migrations } from 'cloudflare:test';

// The migration list type, taken from the function that applies migrations.
type Migrations = Parameters<typeof applyD1Migrations>[1];

// Test-only bindings, added to the Worker's Env type for the test project only.
// This file is included by test/tsconfig.json, not by the root tsconfig.json.
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: Migrations;
    }
  }
}
