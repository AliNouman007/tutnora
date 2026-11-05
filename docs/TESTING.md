# Testing Guide

How Tutnora is tested, and what every change must include.

> Test tooling is introduced in an upcoming batch. Commands in this guide become available then.

## 1. Principles

- **Test behaviour, not implementation.** Tests should survive refactors that do not change behaviour.
- **Be deterministic.** Tests never depend on the real clock, network access, random values, or execution order. Pass `now` explicitly, and use fixed IDs where identity matters.
- **Fail first.** A test is useful only if it fails without the change it covers. For a bug fix, write the failing test before the fix.
- **Report real results only.** A test counts as passing only after it has been run and its output seen.

## 2. Test levels

| Level | Folder | Covers | Command |
|---|---|---|---|
| Unit | `test/unit/` | Pure functions in `domain/`: status derivation, revision intervals, warm-up selection, and limits | `npm run test:unit` |
| Integration | `test/integration/` | Services and repositories against a real local D1 database | `npm run test:integration` |
| Contract | `test/contract/` | Each MCP tool's input schema, output shape, and error mapping | `npm run test:contract` |
| Security | `test/security/` | Authentication and data isolation between learners | `npm run test:security` |
| End-to-end | `scenarios/` | Real flows in ChatGPT and Claude Code against staging; run manually | — |

`npm test` runs every automated level. `npm run check` runs the tests together with typecheck, lint, and format check.

Shared factories and fixtures live in `test/helpers/`.

## 3. What every change must include

| Change | Required tests |
|---|---|
| Domain rule added or changed | Unit tests, including boundaries and edge cases |
| Service added or changed | Integration tests |
| Tool added or changed | Contract tests and integration tests |
| New table, query, or data access | Integration tests and security tests |
| Bug fix | A test that reproduces the bug, written before the fix |
| Playbook change | Related scenarios re-run, with results recorded in the pull request |
| Refactor | No new tests needed; all existing tests pass unchanged |

A pull request without the required tests is not complete.

## 4. Writing tests

- Name tests by behaviour, for example `it("marks a topic needs_revision after a failed recall")`.
- Build data with factories from `test/helpers/` instead of large inline fixtures.
- Each integration test starts from a known database state and does not depend on other tests.
- Test authentication with test identities. Tests never call GitHub.
- Assert on outcomes the caller can observe, not on internal calls.
- Test one behaviour per test where practical.

## 5. Coverage

- `src/domain/` must keep at least **90%** line and branch coverage. CI fails below this threshold.
- Other layers have no numeric target; the requirements in section 3 apply instead.
- Coverage is a floor. Do not write tests only to raise the number.

## 6. Security tests

For every tool that reads or writes learner data, tests use two learners, A and B, and verify that:

- B cannot read, update, export, or delete A's goals, topics, evidence, or handoffs.
- When B uses an ID that belongs to A, the result is `NOT_FOUND`, without revealing that the record exists.
- Tool schemas reject unknown fields, so a learner ID cannot be injected through input.
- Requests without a valid session are rejected.
- `delete_my_data` without the exact confirmation value deletes nothing.
- After A deletes their data, B's data is unchanged.

These tests are mandatory for every new table and every new tool.

## 7. Manual end-to-end scenarios

`scenarios/` contains numbered markdown scripts. Each scenario states:

- **Setup:** the environment, assistant, and starting data
- **Steps:** what the tester says or does
- **Expected:** what the tutor and the stored data should show

Before each release from staging to production, run the release scenarios in both ChatGPT and Claude Code. Record in the pull request: date, environment, assistant, the result of each scenario, and notes.

Minimum release scenarios for the MVP:

1. First session: sign-in, onboarding, and a saved roadmap
2. Lesson with assessment; evidence and derived status are correct
3. A new session resumes from the latest handoff
4. A second goal is created; the first goal's progress is unchanged
5. A failed topic appears in the next warm-up
6. A second learner cannot see the first learner's data
7. Export returns all data; deletion removes all data

## 8. Playbook evaluation

The playbook cannot be unit tested. Its quality is checked through scenarios focused on tutor behaviour: a definition before the explanation, appropriate depth, the hint limit, no repeated onboarding questions, and correct use of tools. Every playbook change re-runs the affected scenarios.

## 9. Continuous integration

On every pull request, CI runs typecheck, lint, format check, and all automated tests with the domain coverage threshold, and applies every migration to an empty database. A pull request can be merged only when CI passes.

## 10. Failing and flaky tests

- A failing test on `main` is fixed before any new feature work.
- A flaky test gets a GitHub issue the same day and is either fixed or quarantined with a reference to that issue. It is never silently skipped or retried until it passes.
