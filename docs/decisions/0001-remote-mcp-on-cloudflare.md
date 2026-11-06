# 0001. Remote MCP server on Cloudflare

- Status: Accepted
- Date: 2026-11-05
- Superseded in part by: [0005](0005-stateless-mcp-sdk-v2.md) (MCP transport)

## Context

Tutnora must work from ChatGPT Work, including on mobile, and from Claude Code. Learners must see the same progress from any assistant or device. Other people must be able to use it with their own accounts.

ChatGPT connects only to remote MCP servers; it cannot reach a server running on the learner's computer. Local files or a personal Git repository therefore cannot serve as the shared source of truth.

## Decision

Build Tutnora as one remote MCP server, `tutnora-mcp`, on Cloudflare Workers:

- MCP transport through the Cloudflare Agents SDK (`McpAgent`).
- OAuth 2.1 through `@cloudflare/workers-oauth-provider`, with GitHub as the identity provider (see ADR 0004).
- Learning data in Cloudflare D1.
- A single TypeScript package and repository.

## Alternatives considered

- **Local files plus a private Git repository per learner.** Simple and transparent, but unreachable from ChatGPT and mobile, and requires reliable commit and sync behaviour from the AI.
- **Local MCP server.** Works for Claude Code only.
- **Other hosting, such as a container platform with a managed Postgres database.** Viable, but requires building OAuth and MCP transport ourselves and running more infrastructure.
- **A monorepo with separate packages.** Unnecessary for a single deployable.

## Consequences

- One server serves every assistant, so progress is consistent everywhere.
- Cloudflare provides OAuth and MCP transport, so we write less security-sensitive code.
- The project depends on Cloudflare. To limit lock-in, only `src/index.ts`, `src/auth/`, and `src/db/` may use Cloudflare-specific APIs; `domain/` and `services/` stay platform-neutral.
- The operator holds learners' data, so privacy documentation, export, and deletion are MVP requirements.
- Free-tier limits and costs must be reviewed before opening sign-up beyond the allowlist.
