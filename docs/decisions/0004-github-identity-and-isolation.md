# 0004. GitHub identity and per-learner data isolation

- Status: Accepted
- Date: 2026-11-05

## Context

Tutnora stores the learning records of multiple people on one server. One learner must never be able to read or change another learner's data, including through a coding mistake or a manipulated tool call. Tutnora's audience is developers, who usually have GitHub accounts. During the MVP, access must be limited to control cost and abuse.

## Decision

### Identity

- Learners sign in with GitHub through the OAuth flow in ADR 0001.
- A learner is identified by their **GitHub numeric user ID**, not their username, because usernames can change.

### Isolation

- The learner ID comes only from the authenticated session. **No tool accepts a learner ID, or any identifier of another learner, as input.**
- Every table has a `learner_id` column.
- Every repository function in `src/db/` takes `learnerId` as a required parameter and includes it in every query's `WHERE` clause, including updates and deletes.
- An identifier that belongs to another learner is treated as not found. The response does not reveal whether the record exists.
- Security tests in `test/security/` verify that one learner cannot read, update, export, or delete another learner's data through any tool. These tests are required for every new table and every new tool.

### Access during the MVP

- Only GitHub user IDs listed in the `ALLOWED_GITHUB_IDS` environment variable (comma-separated) may complete sign-in.
- Unlisted users receive a clear "invite-only" message.

## Alternatives considered

- **Email and password accounts.** More security-sensitive code to own, with no benefit for a developer audience.
- **Isolation enforced only in services.** One missed check would expose data. Requiring the learner ID at the repository level makes omissions visible in code review and tests.
- **Separate database per learner.** Stronger isolation, but disproportionate operational complexity for the MVP.
- **Open sign-up from the start.** Uncontrolled cost and abuse risk.

## Consequences

- Isolation is enforced by code structure and tests, not by convention alone.
- Learners without GitHub accounts cannot use the MVP. More providers can be added later through a new ADR.
- Opening sign-up requires a follow-up decision on rate limits and cost controls.
