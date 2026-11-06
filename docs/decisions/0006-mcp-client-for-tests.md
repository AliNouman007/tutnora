# 0006. Official MCP client for tool tests

- Status: Accepted
- Date: 2026-11-06

## Context

Contract tests must check each tool the way a real assistant calls it: through the MCP protocol, including input validation and error results. The MCP protocol (2026-07-28) involves version negotiation and request metadata, so hand-written JSON requests would be fragile and would test our assumptions rather than the protocol.

The MCP TypeScript SDK documentation recommends testing a server by connecting its own `Client` to the server's request handler in the same process, with no network.

## Decision

Add `@modelcontextprotocol/client` 2.4.0 as an exact-pinned **development** dependency, matching the server package version (ADR 0005). Contract and tool-level security tests connect this client to `createTutnoraHandler` in process. It is never imported by application code.

## Alternatives considered

- **Hand-written JSON-RPC requests.** No dependency, but tied to protocol details that the SDK already handles, and likely to break when the protocol version changes.
- **Testing tool functions directly.** Skips input validation, error mapping, and the protocol, which are what contract tests exist to check.

## Consequences

- Contract tests exercise the same handler that will serve real assistants.
- The client and server packages must be updated together; Dependabot groups npm updates.
- The development dependency is not deployed.
