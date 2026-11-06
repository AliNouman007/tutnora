import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { TEXT_LIMITS } from '../../domain/limits';
import { endSession } from '../../services/handoff';
import type { ToolContext } from '../context';
import { presentHandoff } from '../present';
import { runTool } from '../results';

const inputSchema = z.strictObject({
  goalId: z.string().min(1).max(TEXT_LIMITS.id),
  summary: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.handoffSummary)
    .describe('What happened in this session, briefly'),
  nextStep: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.handoffNextStep)
    .describe('What the next session should start with'),
  openQuestions: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.handoffOpenQuestions)
    .nullable()
    .optional()
    .describe('Questions or confusions to revisit next time'),
});

export function registerEndSession(server: McpServer, context: ToolContext): void {
  server.registerTool(
    'end_session',
    {
      description:
        'Ends the session for a goal by saving a short handoff: what happened, the next step, and open questions. The next session for this goal resumes from it. Call it before the conversation ends.',
      inputSchema,
    },
    (input) =>
      runTool('end_session', async () => {
        const handoff = await endSession(
          context.db,
          context.identity.learnerId,
          {
            goalId: input.goalId,
            summary: input.summary,
            nextStep: input.nextStep,
            openQuestions: input.openQuestions ?? null,
          },
          context.now(),
        );
        return { handoff: presentHandoff(handoff) };
      }),
  );
}
