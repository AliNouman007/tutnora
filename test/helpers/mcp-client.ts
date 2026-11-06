import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { env } from 'cloudflare:workers';
import { createTutnoraHandler } from '../../src/mcp/server';
import type { LearnerIdentity } from '../../src/services/session';

export interface ToolCallOutcome {
  readonly isError: boolean;
  readonly text: string;
}

export interface TestClient {
  listTools(): Promise<string[]>;
  call(name: string, args?: Record<string, unknown>): Promise<ToolCallOutcome>;
  /** Calls a tool that must succeed and returns its parsed JSON result. */
  callOk(name: string, args?: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

/** Connects the official MCP client to Tutnora's handler in process, as one signed-in learner. */
export async function connectAs(
  identity: LearnerIdentity,
  now: () => Date,
  db: D1Database = env.DB,
): Promise<TestClient> {
  const handler = createTutnoraHandler({ db, identity, now });
  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = new Client(
    { name: 'tutnora-tests', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  );
  await client.connect(transport);

  async function call(name: string, args: Record<string, unknown> = {}): Promise<ToolCallOutcome> {
    const result: unknown = await client.callTool({ name, arguments: args });
    return readOutcome(result);
  }

  return {
    async listTools() {
      const { tools } = await client.listTools();
      return tools.map((tool) => tool.name);
    },
    call,
    async callOk(name, args = {}) {
      const outcome = await call(name, args);
      if (outcome.isError) {
        throw new Error(`Tool ${name} failed: ${outcome.text}`);
      }
      return JSON.parse(outcome.text) as unknown;
    },
    async close() {
      await client.close();
      await handler.close();
    },
  };
}

export function readOutcome(result: unknown): ToolCallOutcome {
  if (typeof result !== 'object' || result === null || !('content' in result)) {
    throw new Error('Unexpected tool result shape.');
  }
  const first: unknown = Array.isArray(result.content) ? result.content[0] : undefined;
  const text =
    typeof first === 'object' && first !== null && 'text' in first && typeof first.text === 'string'
      ? first.text
      : '';
  const isError = 'isError' in result && result.isError === true;
  return { isError, text };
}
