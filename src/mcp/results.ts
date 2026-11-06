import { isAppError } from '../domain/errors';

/** The result shape returned by every Tutnora tool. */
export type ToolResponse = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

const INTERNAL_MESSAGE = 'INTERNAL: Something went wrong on the Tutnora server. Please try again.';

/**
 * Runs a tool's work and turns the outcome into a tool result. Expected errors keep their code
 * and safe message. Anything else is logged with the tool name only and reported with a generic
 * message, so database details and stack traces never reach the assistant.
 */
export async function runTool(
  toolName: string,
  work: () => Promise<unknown>,
): Promise<ToolResponse> {
  try {
    const value = await work();
    return { content: [{ type: 'text', text: JSON.stringify(value) }] };
  } catch (error) {
    if (isAppError(error) && error.code !== 'INTERNAL') {
      return {
        content: [{ type: 'text', text: `${error.code}: ${error.message}` }],
        isError: true,
      };
    }
    console.error(JSON.stringify({ event: 'tool_error', tool: toolName, code: 'INTERNAL' }));
    return { content: [{ type: 'text', text: INTERNAL_MESSAGE }], isError: true };
  }
}
