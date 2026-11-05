# 0003. Progress status derived from evidence

- Status: Accepted
- Date: 2026-11-05

## Context

Progress must be honest. If the AI could write a topic's status directly, a summarising mistake, an over-generous judgment, or a retried call could mark a topic as learned without proof. Learners also need revision at sensible intervals so they do not forget topics.

## Decision

The AI records **evidence**: one assessment of one topic, with its kind, the support given, and the result. Evidence is append-only.

A topic's **status** and **next review date** are pure functions of that topic's evidence history and the current time. They are calculated on demand in `domain/` and never stored.

### Status

Determined by the most recent evidence:

| Latest evidence | Status |
|---|---|
| None | `not_started` |
| `pass` + `independent` | `demonstrated` |
| `pass` + `hinted` or `ai_assisted` | `practised` |
| `pass` + `solution_shown` | `learning` |
| `partial` or `fail`, after any earlier `practised` or `demonstrated` state | `needs_revision` |
| `partial` or `fail`, otherwise | `learning` |

### Next review

Measured from the time of the most recent evidence:

| Latest evidence | Interval |
|---|---|
| `pass` + `independent` | 3, 7, 21, or 60 days for the 1st, 2nd, 3rd, and 4th or later consecutive independent pass |
| `pass` + `hinted` or `ai_assisted` | 2 days; the consecutive count is unchanged |
| `pass` + `solution_shown` | 1 day; the consecutive count resets |
| `partial` or `fail` | 1 day; the consecutive count resets |

A topic is due when its next review time is at or before the current time.

### Warm-up selection

At most three due topics, ordered by:

1. `needs_revision` before other statuses
2. Tier: `core`, then `working`, then `awareness`
3. Most overdue first

## Alternatives considered

- **AI writes status directly.** Simple, but unverifiable and error-prone.
- **Stored status updated by the server.** Faster reads, but risks stale or inconsistent data, and a rule change would need a data migration. Derivation keeps rule changes to a code change.
- **A full spaced-repetition algorithm such as SM-2.** More precise, but harder to explain to learners and to test. It can replace this rule set later through a new ADR.

## Consequences

- Progress cannot be marked as learned without recorded evidence.
- Changing a rule re-evaluates all history consistently, without a migration.
- AI-assisted work counts as practice, not concept mastery. Agentic skills will be tracked as separate topics when that mode is introduced.
- Derivation reads evidence on every progress request. This is acceptable at MVP scale; caching can be added later if measurements require it.
- The rules are fully covered by unit tests in `test/unit/`.
