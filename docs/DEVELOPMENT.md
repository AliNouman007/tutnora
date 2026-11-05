# Development Guide

How to set up, plan, write, review, and ship changes to Tutnora. Architecture rules are in [ARCHITECTURE.md](ARCHITECTURE.md). Testing rules are in [TESTING.md](TESTING.md).

> Typecheck, lint, format, and unit test tooling is in place. `npm run dev`, `npm run db:migrate:local`, and the `.dev.vars` setup arrive with the first server batch.

## 1. Prerequisites

- Node.js, using the version in `.nvmrc`
- npm (included with Node.js)
- Git
- For staging or production work only: a Cloudflare account and a GitHub OAuth app

## 2. Local setup

```bash
git clone https://github.com/AliNouman007/tutnora.git
cd tutnora
npm ci
cp .dev.vars.example .dev.vars   # fill in local values; never commit this file
npm run db:migrate:local
npm run dev
```

Run `npm run check` once to confirm that the setup works.

## 3. Roles and workflow

| Role | Responsibility |
|---|---|
| Project owner | Scope, priorities, approval of major decisions and ADRs, merging |
| Authoring agent | Designs and writes code, tests, migrations, and documentation |
| Implementation agent | Applies files exactly, runs commands, and reports results |

Every change follows this loop:

1. **Plan.** State the goal, the files to change, the tests to add, and the docs to update. Major technical decisions need an approved ADR first (see [decisions/README.md](decisions/README.md)).
2. **Author.** The authoring agent provides a batch: complete files, commands, expected results, and acceptance criteria. Work that has not been run is labelled "Not yet executed".
3. **Apply and run.** The implementation agent applies the files exactly, on a branch, and runs the commands.
4. **Report.** Results are reported in the batch report format in `AGENTS.md`, with full failure output and any deviations.
5. **Fix.** The authoring agent analyses failures and provides corrected files. Repeat from step 3.
6. **Review and merge.** A pull request is opened. The owner reviews it against section 6 and merges.

Keep batches small: one purpose, reviewable in one sitting.

## 4. Git and GitHub

### Branches

`main` is always deployable. Nobody pushes to it directly. Branch from the latest `main`, named by type:

| Prefix | Use |
|---|---|
| `feat/` | New behaviour |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Structural change without behaviour change |
| `chore/` | Tooling, dependencies, and configuration |

Example: `feat/record-evidence`.

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org): `type: short imperative summary`, for example `fix: reset revision streak after failed recall`. Types match the branch prefixes.

### Pull requests

- One purpose per pull request. Never combine a refactor, a behaviour change, and formatting.
- The description follows `.github/pull_request_template.md` and the rules in "Pull request descriptions" below.
- CI must pass before merging. While CI is unavailable, post a local verification record instead (see below).
- Merge with **squash** and delete the branch afterwards.

### Pull request descriptions

Every pull request description is written for the project owner, who may not read the code. A reader should understand what the pull request does, why, how it was verified, and what it means for learners without opening any file.

**Required sections.** Use every section in the template, in order. If a section does not apply, write "N/A" and a short reason, for example "N/A: no visual change". Never delete a section.

| Section | Must contain |
|---|---|
| Summary (plain English) | 2–4 simple sentences on what the pull request accomplishes |
| Why this change is needed | The problem solved and why it matters for Tutnora |
| What changed | Each important file or component and its purpose, including documentation updated or "none" |
| How it works | The behaviour, step by step |
| Real-world example | A concrete, realistic example: inputs and outputs for backend changes, before and after for UI changes |
| Before vs. after | What was possible before, and what is possible now |
| User impact | Whether learners can use this today; internal groundwork must be labelled as such |
| Testing and verification | Commands that actually ran and their observed results, coverage when relevant, and limitations |
| Risks and limitations | Known risks, open issues, and what is not implemented |
| How to review this PR | A short checklist for the owner: what to read and what behaviour to confirm |
| What's next | Where this fits in the roadmap, dependencies, and what remains |
| Screenshots or videos | Real before-and-after evidence for visual changes; otherwise "N/A" |

**Writing rules.**

- Use plain language. Explain a technical term the first time you use it.
- Match the length to the change. A documentation fix needs a sentence or two per section; a new feature needs more. Avoid boilerplate.
- Stay technically accurate. Simple wording must not change the meaning.
- Never claim a check passed unless it ran and its output was observed. Mark anything not yet run as "Not yet run".
- Never invent screenshots, recordings, examples presented as real results, or test output.

**Who writes it.**

- The authoring agent drafts the full description for every batch, as a file.
- The implementation agent replaces only the clearly marked result placeholders with observed results, and changes nothing else.
- Create pull requests with `gh pr create --body-file <file>` and update them with `gh pr edit <number> --body-file <file>`. Keep description files outside the repository.
- Agents may use their own pull-request writing tools or skills, but the result must follow this template. The repository must never depend on a contributor's personal tools.

**Readiness.** A pull request with a missing, unclear, or unverified description is not ready for review, and the owner may decline to review it until it is fixed.

### Verification while CI is unavailable

GitHub Actions cannot currently run on this repository's account. This is tracked in a GitHub issue labelled `tech-debt`. Until CI runs again, every pull request needs a **local verification record** before merging:

1. On the pull request's exact head commit, run:

   ```bash
   npx -y npm@11 ci
   npm run check
   npm audit --omit=dev
   ```

2. Post the results as a pull request comment, using this template:

   ```markdown
   ## Local verification record (CI unavailable)

   - Commit: <full SHA>
   - Environment: Node <version>, npm <version>
   - Clean install: <result>
   - npm run check: <result, including test counts>
   - npm audit --omit=dev: <result>
   - Notes: <anything unexpected, or "None">
   ```

3. The owner merges only after the record has been posted and reviewed.

When CI runs again, this section is removed and `check` becomes a required status check on `main`.

## 5. Coding conventions

### Naming

| Item | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `record-evidence.ts` |
| Functions and variables | camelCase | `deriveTopicStatus` |
| Types and interfaces | PascalCase | `EvidenceRecord` |
| Fixed constants | UPPER_SNAKE_CASE | `MAX_NOTE_LENGTH` |
| Database tables and columns | snake_case | `learner_id` |
| MCP tools | snake_case verb phrase | `record_evidence` |
| Topic keys | lowercase dot path | `css.layout.position` |

### Code

- TypeScript `strict`. No `any`; use `unknown` and narrow it.
- Named exports only; no default exports.
- One tool per file in `src/mcp/tools/`. One use case per function in `src/services/`.
- Prefer small, pure functions. Consider splitting a file longer than about 300 lines.
- Do not create an abstraction until a pattern appears three times.
- Comments explain *why*, not *what*.
- `TODO` comments must reference a GitHub issue, for example `// TODO(#12): …`.

### Errors

- Throw `AppError` with a code defined in `domain/`: `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, or `INTERNAL`.
- Do not catch an error only to ignore it or rethrow it unchanged.
- Only `src/mcp/` converts errors into messages for the assistant. Messages must not include stack traces, SQL, or other learners' data.

### Logging

Log the tool name, error code, and timing. Never log learner content or secrets.

## 6. Review checklist

Use this for every pull request, especially AI-generated code:

- [ ] Layer rules respected: no I/O in `domain/`, no SQL outside `db/`, no logic in tools
- [ ] Every query is scoped by `learnerId`; no learner ID is accepted from tool input
- [ ] Tool input is validated, with length limits on text
- [ ] Tests cover the change and would fail without it
- [ ] Isolation tests are added for new data access
- [ ] Errors are handled, and messages are safe
- [ ] No dead code, duplicated logic, or unnecessary abstraction
- [ ] No new dependency without an approved ADR
- [ ] Documentation is updated in the same pull request
- [ ] Reported test results come from actual runs

For large changes, ask a separate AI session that did not write the code to review it against this checklist.

## 7. Common changes

### Add an MCP tool

1. Confirm the tool fits [ARCHITECTURE.md](ARCHITECTURE.md) section 6, or propose an ADR.
2. Add the service function and its integration tests.
3. Add `src/mcp/tools/<tool-name>.ts` with a strict zod schema, and register it in `src/mcp/server.ts`.
4. Add contract tests and security tests.
5. Update ARCHITECTURE.md section 6 and, if the tutor should use the tool, the playbook.

### Change the database

1. Add a new numbered migration in `migrations/`. Never edit a migration already on `main`.
2. Give every new table a `learner_id` column with an index.
3. Update the repository functions and ARCHITECTURE.md section 4.
4. Add integration tests and security tests.
5. Apply the migration to staging before production.

### Change the playbook

1. Edit `playbook/` and increase the playbook version.
2. Re-run the related scenarios in `scenarios/` and record the results in the pull request.

### Add a dependency

Write an ADR that covers the reason, the alternatives (including not adding a dependency), size, maintenance status, and licence. Add the dependency only after approval.

## 8. Documentation

- A change to behaviour, interfaces, data, or process updates the related document in the same pull request.
- `AGENTS.md` holds rules and links only. Explanations belong in `docs/`.
- Accepted ADRs are never rewritten. A new ADR supersedes them.

## 9. Refactoring and technical debt

- Refactors are separate pull requests with no behaviour change. Existing tests must pass unchanged.
- Known shortcuts are recorded as GitHub issues labelled `tech-debt` and referenced from the code where relevant.
- Review open `tech-debt` issues before starting work in a new feature area.

## 10. Environments and deployment

| Environment | Purpose |
|---|---|
| Local | Development and automated tests |
| Staging (`tutnora-mcp-staging`) | Manual end-to-end testing with ChatGPT and Claude Code |
| Production (`tutnora-mcp`) | Real learners |

- Deploy only from `main`.
- Apply migrations and deploy to staging first, run the release scenarios, then release to production.
- Set secrets per environment with Wrangler secrets. Never commit them.

Deployment commands will be documented when deployment is configured.
