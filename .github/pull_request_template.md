## What and why

<!-- What does this change do, and why is it needed? Link the batch or issue. -->

## How it was tested

<!-- Exact commands run and their results. Do not report results that were not observed. -->

## Documentation

<!-- Which documents were updated, or why none were needed. -->

## Review checklist

- [ ] Layer rules respected: no I/O in `domain/`, no SQL outside `db/`, no logic in tools
- [ ] Every query is scoped by `learnerId`; no learner ID accepted from tool input
- [ ] Tool input validated, with length limits on text
- [ ] Tests cover the change and would fail without it
- [ ] Isolation tests added for new data access
- [ ] Errors handled; messages are safe
- [ ] No dead code, duplicated logic, or unnecessary abstraction
- [ ] No new dependency without an approved ADR
- [ ] Documentation updated in this pull request
- [ ] Reported results come from actual runs
