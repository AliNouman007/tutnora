# AGENTS.md

Instructions for AI coding agents working on Tutnora. Human contributors follow the same rules.

Tutnora (*Your Personal AI Learning Companion*) is a remote MCP server, `tutnora-mcp`, on Cloudflare Workers. It gives AI assistants a persistent, evidence-based tutor.

## Before you change anything

1. Read this file completely.
2. Read `docs/ARCHITECTURE.md`. It defines the layers, dependency rules, data model, and tools.
3. Read the ADRs in `docs/decisions/` related to your change.
4. Read the existing code and tests in the area you will touch.
5. For process, see `docs/DEVELOPMENT.md`. For tests, see `docs/TESTING.md`.

If these documents conflict with your task, stop and report the conflict. Do not resolve it yourself.

## Roles

| Role | Responsibility |
|---|---|
| Project owner | Approves scope, major technical decisions, ADRs, and merges |
| Authoring agent | Designs and writes code, tests, migrations, and docs in small batches |
| Implementation agent | Applies provided files exactly, runs commands, and reports results |

Your task assignment states your role. If it does not, ask before making changes.

### Implementation agent rules

- Apply provided file contents exactly. Do not redesign, refactor, reformat, or improve them.
- If a file cannot be applied or a command fails, stop and report. Do not fix it yourself unless the owner explicitly allows it.
- Report every batch in the format below.
- Never report a check as passing unless you ran it and saw it pass.

### Authoring agent rules

- Provide complete files with full paths, not partial snippets.
- Deliver small batches, each with a goal, commands, expected results, and acceptance criteria.
- Include tests with every behaviour change.
- Label work "Not yet executed" until real results are reported.

## Architecture rules (summary)

Full rules: `docs/ARCHITECTURE.md` section 3.

- Imports flow `mcp → services → domain` and `services → db`. `domain/` imports nothing outside itself.
- The learner ID comes only from the authenticated session. Never accept it as tool input.
- Every repository function takes `learnerId` and uses it in every query.
- Topic status and next review are derived from evidence (ADR 0003). Never store them.
- Domain functions receive `now` as a parameter; they never read the clock.
- Validate untrusted input with zod, only in `src/mcp/tools/`.
- Each tool calls exactly one service function.

## Never

- Add a dependency without an approved ADR.
- Edit a migration that is already on `main`. Add a new migration instead.
- Weaken, skip, or delete a test to make a check pass.
- Read, print, log, or commit secrets, tokens, or `.dev.vars`.
- Log learner content such as notes, summaries, or handoffs.
- Combine a refactor, a behaviour change, and formatting in one change.
- Push directly to `main`.
- Claim a check passed without running it.
- Make a major technical decision without the owner's approval.

## Definition of done

- [ ] `npm run check` passes (typecheck, lint, format check, and all automated tests)
- [ ] New or changed behaviour has tests that would fail without the change
- [ ] New or changed data access has isolation tests in `test/security/`
- [ ] Related documentation is updated in the same change
- [ ] The report lists the exact commands run and their results

## Commands

| Command | Purpose |
|---|---|
| `npm run check` | Everything required before a pull request |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint, including layer boundary rules |
| `npm run format` | Apply Prettier formatting |
| `npm test` | All automated tests |
| `npm run test:unit` | Unit tests |
| `npm run test:integration` | Integration tests |
| `npm run test:contract` | Tool contract tests |
| `npm run test:security` | Isolation and authentication tests |
| `npm run dev` | Run the server locally |
| `npm run db:migrate:local` | Apply migrations to the local database |

These commands become available when project tooling is added. If a command is missing, report it. Do not create it.

## Batch report format

```text
Batch: <number>
Files applied: <list>
Commands run: <exact commands>
Result: PASS / FAIL / BLOCKED
Full output of any failure: <untrimmed>
Deviations from provided content: <none, or what and why>
```

## Git

- Branch from the latest `main` using a type prefix: `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, or `chore/`.
- Write Conventional Commit messages, for example `fix: reset revision streak after failed recall`.
- Open a pull request. The owner reviews it and merges with squash.
