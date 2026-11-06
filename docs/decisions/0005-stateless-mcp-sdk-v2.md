# 0005. Stateless MCP server with the MCP TypeScript SDK v2

- Status: Accepted
- Date: 2026-11-06
- Supersedes: the MCP transport part of [ADR 0001](0001-remote-mcp-on-cloudflare.md) (the Cloudflare Agents SDK `McpAgent`)

## Context

ADR 0001 chose the Cloudflare Agents SDK's `McpAgent` class, which keeps a Durable Object and protocol session for each MCP connection. Since then, Cloudflare's documentation has directed new servers away from `McpAgent` and towards stateless handlers, and the MCP specification (2026-07-28) has become stateless.

Tutnora stores all learning state in D1. It needs no MCP protocol sessions, server-initiated requests, or per-connection storage.

Three ways to build the server were considered:

1. `McpAgent` from the Agents SDK.
2. The Agents SDK's stateless wrapper (`agents/mcp/server`) around the MCP TypeScript SDK v2.
3. The MCP TypeScript SDK v2's own `createMcpHandler`, with `@cloudflare/workers-oauth-provider` for sign-in.

## Decision

Use option 3.

- The Worker serves MCP with `createMcpHandler` from `@modelcontextprotocol/server`, using a server factory. Every request gets a fresh server. There are no Durable Objects and no protocol sessions.
- The SDK's default compatibility for 2025-era MCP clients stays enabled, so current versions of ChatGPT and Claude Code can connect.
- `@cloudflare/workers-oauth-provider` wraps the Worker. It serves the OAuth endpoints, validates the access token on every `/mcp` request, and passes the signed-in learner's GitHub numeric ID and username to the MCP handler.
- `src/index.ts` builds each request's MCP server with the authenticated identity and the D1 binding. Tools receive the learner's identity only this way, never from tool input (ADR 0004).
- Host and Origin headers are validated in front of the handler, following the MCP SDK's guidance for web-standard runtimes.
- The OAuth provider stores grants and tokens in a KV namespace bound as `OAUTH_KV`. Local development uses local KV; staging and production namespaces are created in milestone M6.
- Runtime dependencies, pinned exactly: `@modelcontextprotocol/server` 2.4.0, `zod` 4.6.7, and `@cloudflare/workers-oauth-provider` 1.2.4. The MCP SDK also depends on `zod` (^4.2.0), so the project uses one `zod` version.

## Alternatives considered

- **`McpAgent`.** Deprecated by Cloudflare for new servers. Adds Durable Objects and per-session state that Tutnora does not need.
- **Agents SDK stateless wrapper.** Supported by Cloudflare and passes OAuth details to tools automatically, but the `agents` package brings a very large set of peer dependencies and requires an exact MCP SDK version, which makes upgrades harder.
- **Writing the MCP protocol by hand.** No dependency, but Tutnora would own protocol correctness and compatibility with every client.

## Consequences

- Three runtime dependencies instead of a large framework.
- Tutnora writes a small identity bridge between the OAuth provider and the MCP server, and covers it with security tests.
- MCP SDK v2 is a new major version. Dependabot proposes updates; every update must pass the full test suite and the manual client scenarios.
- Server-initiated MCP features (sampling and elicitation) are not available in stateless mode. The tutor does not need them.
- Compatibility with real clients is confirmed manually with Claude Code (milestone M5) and ChatGPT Work (milestone M6).
