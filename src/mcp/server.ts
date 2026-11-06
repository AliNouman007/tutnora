import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { ToolContext } from './context';
import { registerSaveGoalRoadmap } from './tools/save-goal-roadmap';
import { registerStartSession } from './tools/start-session';
import { registerUpdatePreferences } from './tools/update-preferences';

export const SERVER_INFO = { name: 'tutnora-mcp', version: '0.1.0' } as const;

/** Builds a Tutnora MCP server for one request, tied to the signed-in learner in the context. */
export function createTutnoraServer(context: ToolContext): McpServer {
  const server = new McpServer(SERVER_INFO);
  registerStartSession(server, context);
  registerSaveGoalRoadmap(server, context);
  registerUpdatePreferences(server, context);
  return server;
}

/** Creates the stateless MCP request handler for one signed-in learner (ADR 0005). */
export function createTutnoraHandler(context: ToolContext) {
  return createMcpHandler(() => createTutnoraServer(context));
}
