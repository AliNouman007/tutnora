# Architecture Decision Records

An Architecture Decision Record (ADR) documents one significant technical decision: the context, the decision, the alternatives considered, and the consequences.

## When to write an ADR

Write an ADR before:

- Adding a runtime dependency
- Changing a layer boundary or dependency rule in `docs/ARCHITECTURE.md`
- Changing the data model in a way that affects existing data
- Changing authentication, authorization, or data isolation
- Changing how progress or revision is calculated

## Rules

- Number ADRs sequentially: `NNNN-short-title.md`.
- An accepted ADR is never edited, except to fix typos or add a "Superseded by" link.
- To change a decision, write a new ADR and mark the old one as superseded.
- The project owner approves every ADR before implementation begins.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-remote-mcp-on-cloudflare.md) | Remote MCP server on Cloudflare | Accepted |
| [0002](0002-playbook-served-by-server.md) | Playbook served by the server | Accepted |
| [0003](0003-status-derived-from-evidence.md) | Progress status derived from evidence | Accepted |
| [0004](0004-github-identity-and-isolation.md) | GitHub identity and per-learner data isolation | Accepted |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

What problem are we solving, and what constraints apply?

## Decision

What we decided, stated clearly.

## Alternatives considered

Each alternative and why it was not chosen.

## Consequences

What becomes easier, what becomes harder, and what follow-up work is required.
```
