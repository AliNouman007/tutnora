# Tutnora Architecture

This document describes how `tutnora-mcp` is built and the rules that keep it maintainable. It is the primary technical reference for developers and AI coding agents. Read it before changing code.

The reasoning behind key decisions is recorded in [`docs/decisions/`](decisions/README.md).

## 1. System overview

Tutnora is a single remote MCP server, `tutnora-mcp`, deployed as a Cloudflare Worker.

```text
┌───────────────────────┐  MCP + OAuth  ┌──────────────────────────────────────┐
│ AI assistant          │ ────────────▶ │ tutnora-mcp (Cloudflare Worker)      │
│ ChatGPT / Claude Code │               │                                      │
└───────────────────────┘               │  auth → mcp → services → domain      │
                                        │                   │                  │
                                        │                   ▼                  │
                                        │                   db ──▶ D1 (SQLite) │
                                        │                                      │
                                        │  playbook (bundled markdown)         │
                                        └──────────────────────────────────────┘
```

Responsibilities are deliberately split:

- The **AI assistant** conducts the conversation. It teaches, asks questions, and judges the learner's answers, guided by the playbook.
- **tutnora-mcp** stores the learning record, enforces data isolation, and calculates progress and revision schedules with deterministic rules.
- The **playbook** defines how the tutor behaves. The server provides it, so every connected assistant receives the same instructions.

The AI reports *what happened* (evidence). The server decides *what it means* (status and next review). See [ADR 0003](decisions/0003-status-derived-from-evidence.md).

## 2. Technology

| Concern | Choice |
|---|---|
| Language | TypeScript, `strict` mode |
| Runtime | Cloudflare Workers |
| MCP transport | Official MCP TypeScript SDK v2 (`@modelcontextprotocol/server`), stateless `createMcpHandler` ([ADR 0005](decisions/0005-stateless-mcp-sdk-v2.md)) |
| Authentication | `@cloudflare/workers-oauth-provider`, with GitHub as the identity provider |
| Database | Cloudflare D1 (SQLite); raw SQL with prepared statements; no ORM |
| Validation | zod, at the tool boundary only |
| Testing | Vitest with Cloudflare's Workers test integration |
| Lint and format | ESLint and Prettier |
| Package manager | npm |

Exact package versions are pinned in `package.json` when tooling is introduced. Adding a runtime dependency requires an ADR.

The Worker is stateless. Each MCP request gets a fresh server built for the signed-in learner. All learning state lives in D1; OAuth grants and tokens live in a KV namespace (`OAUTH_KV`).

## 3. Layers and dependency rules

```text
src/
├── index.ts        wiring only
├── env.ts          environment and binding types
├── auth/           GitHub OAuth; produces the authenticated learner identity
├── mcp/            tool registration and thin tool handlers
├── services/       use cases; orchestrate domain and db
├── domain/         pure business rules, types, errors, limits
├── db/             repositories; all SQL lives here
└── playbook/       loads the bundled playbook markdown
```

Allowed imports (an arrow means "may import from"):

```text
index.ts → auth, mcp, env
mcp      → services, domain, playbook
services → domain, db
db       → domain (types and errors only)
auth     → env
domain   → nothing outside domain
```

| Layer | Owns | Must not |
|---|---|---|
| `domain/` | Status derivation, revision scheduling, entity types, text limits, `AppError` | Perform I/O, read the clock, or import from another layer |
| `services/` | One function per use case; transaction boundaries | Know about MCP, HTTP, or zod |
| `db/` | SQL and row-to-entity mapping | Contain business rules |
| `mcp/` | zod input schemas, calling one service, shaping output, mapping errors | Contain business logic or SQL |
| `auth/` | OAuth flow, allowlist check, learner identity | Read or write learning data |
| `playbook/` | Returning playbook sections and the playbook version | Contain user data |

### Rules that apply everywhere

- **Time:** the tool layer reads the clock once per call and passes `now` down. Services, repositories, and domain functions never read the clock themselves. Timestamps are stored as UTC ISO 8601 strings.
- **Identity:** the learner ID comes only from the authenticated session. No tool accepts a learner ID as input.
- **Validation:** untrusted input is validated once, at the tool boundary. Inner layers trust their typed inputs.
- **Errors:** inner layers throw `AppError` with a code. The `mcp/` layer converts errors into safe messages.

## 4. Data model

Every table has a `learner_id` column, and every query filters by it. See [ADR 0004](decisions/0004-github-identity-and-isolation.md).

Foreign keys include `learner_id`, so a record can only reference records that belong to the same learner. Deleting a learner removes all of their goals, topics, evidence, and handoffs. Allowed values and the documented text limits are also enforced with `CHECK` constraints in the database. The schema is defined in `migrations/`.

### `learners`

| Column | Notes |
|---|---|
| `id` | GitHub numeric user ID, stored as text; primary key |
| `github_login` | Display only; may change |
| `language` | Preferred teaching language, for example `roman-urdu` |
| `hint_limit` | Default `3` |
| `session_minutes` | Default `40` |
| `created_at`, `updated_at` | UTC ISO 8601 |

### `goals`

| Column | Notes |
|---|---|
| `id` | UUID |
| `learner_id` | |
| `title` | For example "Frontend interview preparation" |
| `purpose` | `interview` · `project` · `revision` · `skill` · `other` |
| `target_level` | Free text, for example "mid-level" |
| `mode` | `topic` · `project` · `mixed` |
| `status` | `active` · `paused` · `done`; set to `active` on creation in the MVP |
| `created_at`, `updated_at` | |

A learner may have several active goals. Creating a goal never changes another goal.

### `topics`

| Column | Notes |
|---|---|
| `id` | UUID |
| `learner_id`, `goal_id` | |
| `key` | Dot-path slug, unique within a goal, for example `css.layout.position` |
| `parent_key` | `null` for top-level topics |
| `title` | |
| `tier` | `core` · `working` · `awareness` |
| `position` | Order among siblings |
| `sources` | JSON array of reference URLs |
| `created_at`, `updated_at` | |

Saving a roadmap upserts topics by `key`. Topics missing from a later save are kept: the MVP never deletes topics implicitly, so a roadmap update cannot erase learning history.

### `evidence`

| Column | Notes |
|---|---|
| `id` | UUID |
| `learner_id`, `goal_id`, `topic_id` | |
| `kind` | `explain` · `predict_output` · `debug` · `build` · `interview_answer` · `recall` |
| `support` | `independent` · `hinted` · `ai_assisted` · `solution_shown` |
| `result` | `pass` · `partial` · `fail` |
| `note` | Short assessor note; maximum 500 characters |
| `request_id` | Optional idempotency key; unique per learner |
| `created_at` | Server time; never supplied by the client |

Evidence is append-only and never edited.

### `handoffs`

| Column | Notes |
|---|---|
| `id` | UUID |
| `learner_id`, `goal_id` | |
| `summary` | Maximum 1,000 characters |
| `next_step` | Maximum 500 characters |
| `open_questions` | Optional; maximum 500 characters |
| `created_at` | |

The latest handoff for a goal is used to resume that goal.

### Not stored

Full conversations, learner code submissions, and any data not listed above. The privacy policy will be documented in `docs/PRIVACY.md`.

## 5. Progress and revision

A topic's status and next review date are **derived** from its evidence whenever they are needed. They are never stored. The full rules and rationale are in [ADR 0003](decisions/0003-status-derived-from-evidence.md). Summary:

| Latest evidence | Status | Next review after |
|---|---|---|
| None | `not_started` | — |
| `pass` + `independent` | `demonstrated` | 3, 7, 21, then 60 days, by count of consecutive independent passes |
| `pass` + `hinted` or `ai_assisted` | `practised` | 2 days |
| `pass` + `solution_shown` | `learning` | 1 day |
| `partial` or `fail` | `needs_revision` if previously `practised` or `demonstrated`; otherwise `learning` | 1 day |

A session warm-up includes at most three due topics, ordered by `needs_revision` first, then tier (`core`, `working`, `awareness`), then the most overdue.

## 6. MCP tools

| Tool | Purpose | Writes |
|---|---|---|
| `start_session` | Returns the learner profile, goals, the focus goal's latest handoff, due revision topics, and the playbook version; creates the learner profile on first use | Learner (first use only) |
| `get_playbook` | Returns one playbook section | — |
| `update_preferences` | Saves the learner's language, hint limit, and session length; only the given values change | Learner |
| `save_goal_roadmap` | Creates a goal, or adds and updates topics in an existing goal | Goal, topics |
| `record_evidence` | Records one assessment result for one topic; returns the derived status and next review | Evidence |
| `end_session` | Saves a handoff for a goal | Handoff |
| `get_progress` | Returns status counts and per-topic status for a goal | — |
| `export_my_data` | Returns all of the learner's data as JSON | — |
| `delete_my_data` | Permanently deletes all of the learner's data; requires the exact confirmation value `DELETE MY TUTNORA DATA` | Deletes all learner data |

`start_session` focuses on the goal the assistant asks for; otherwise on the goal with the most recent handoff; otherwise on the newest active goal. It reports whether this is the learner's first session, so the tutor knows to run onboarding. `save_goal_roadmap` validates topics before saving anything: keys must be valid and unique within the save, every parent must exist in the roadmap, and the topic tree must not contain cycles.

Each tool calls exactly one service function. Input schemas, output shapes, and error codes live in `src/mcp/tools/` and are covered by contract tests.

The server's MCP `instructions` tell the assistant to call `start_session` first and to follow the playbook. See [ADR 0002](decisions/0002-playbook-served-by-server.md).

## 7. Request flow example: `record_evidence`

1. The OAuth provider validates the access token and supplies the learner identity.
2. The tool handler validates the input with zod: goal, topic key, kind, support, result, note length, and optional request ID.
3. The handler calls the service with the learner ID, the validated input, and the current time.
4. The service loads the goal and topic **scoped to the learner**. If either is missing, it throws `AppError` with code `NOT_FOUND`.
5. If the request ID was already recorded for this learner, the service returns the existing result; a retried call does not create duplicate evidence. If the same request ID was used for a different topic, the service returns `CONFLICT`.
6. The service inserts the evidence, loads the topic's evidence history, and calls the domain function that derives status and next review.
7. The handler returns the derived result. Any error is mapped to a safe message.

## 8. Playbook

The playbook in `playbook/` is product content written in English. It tells the tutor how to onboard learners, research roadmaps, teach, assess, and run sessions. The tutor always speaks the learner's preferred language.

The playbook is bundled into the Worker at build time and carries a version string. Playbook changes follow the same review process as code and require re-running the relevant manual scenarios in `scenarios/`.

## 9. Errors, logging, and limits

- **Error codes:** `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `INTERNAL`.
- Messages returned to the assistant never include stack traces, SQL, or another learner's data.
- **Logs** record the tool name, error code, and timing. They never record notes, summaries, or other learner content.
- **Text limits** are defined once in `domain/` and enforced at the tool boundary.

## 10. Environments

| Environment | Worker | Database | Purpose |
|---|---|---|---|
| Local | `wrangler dev` | Local D1 | Development and automated tests |
| Staging | `tutnora-mcp-staging` | Separate D1 | Manual end-to-end testing with real assistants |
| Production | `tutnora-mcp` | Separate D1 | Real learners |

Migrations are applied to staging before production. Secrets are never committed.

## 11. Out of scope for the MVP

- In-chat progress widget
- Tools to pause or archive goals (several goals can be active at once)
- Deep project-based and agentic learning modes
- Additional sign-in providers, an admin interface, and a shared topic catalog
- Rate limiting beyond the sign-up allowlist

Each of these should fit the existing layers without restructuring. If one does not, write an ADR first.
