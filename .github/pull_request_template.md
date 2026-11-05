<!--
Write for the project owner, who may not read the code.
Use plain language and explain technical terms the first time you use them.
Keep every section. If one does not apply, write "N/A" and a short reason.
Full rules: docs/DEVELOPMENT.md, section 4, "Pull request descriptions".
-->

## Summary (plain English)

<!-- 2–4 simple sentences: what this pull request accomplishes. -->

## Why this change is needed

<!-- The problem it solves and why it matters for Tutnora. -->

## What changed

<!-- Each important file or component and its purpose. Include documentation updated, or "none". -->

## How it works

<!-- The behaviour, step by step. -->

## Real-world example

<!-- A concrete, realistic example. Backend: inputs and outputs. UI: before and after. -->

## Before vs. after

<!-- What was possible before, and what is possible now. -->

## User impact

<!-- Can learners use this today? Label internal groundwork clearly. -->

## Testing and verification

<!-- Only results that were actually observed: commands, test counts, coverage when relevant.
     Mark anything not yet run as "Not yet run". While CI is unavailable, link the local verification record. -->

## Risks and limitations

<!-- Known risks, open issues, and what is not implemented. -->

## How to review this PR

- [ ] <!-- What the owner should read or confirm -->

## What's next

<!-- Where this fits in the roadmap, dependencies, and what remains. -->

## Screenshots or videos

<!-- Real evidence for visual changes only. Otherwise: "N/A: no visual change." -->

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
