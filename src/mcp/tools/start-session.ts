import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { TEXT_LIMITS } from '../../domain/limits';
import { startSession } from '../../services/session';
import type { ToolContext } from '../context';
import { presentGoal, presentHandoff, presentLearner } from '../present';
import { runTool } from '../results';

const inputSchema = z.strictObject({
  goalId: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.id)
    .optional()
    .describe('Goal to focus on. Omit it to resume where the learner stopped.'),
});

export function registerStartSession(server: McpServer, context: ToolContext): void {
  server.registerTool(
    'start_session',
    {
      description:
        'Call this first in every tutoring session. Creates the learner profile on first use and returns the learner, their goals, the goal to focus on, its last handoff, and up to three topics to revise as a warm-up. isNewLearner is true on the first session, which means onboarding is needed.',
      inputSchema,
    },
    ({ goalId }) =>
      runTool('start_session', async () => {
        const session = await startSession(
          context.db,
          context.identity,
          goalId ?? null,
          context.now(),
        );
        return {
          isNewLearner: session.isNewLearner,
          learner: presentLearner(session.learner),
          goals: session.goals.map(presentGoal),
          focusGoal: session.focusGoal === null ? null : presentGoal(session.focusGoal),
          lastHandoff: session.lastHandoff === null ? null : presentHandoff(session.lastHandoff),
          warmUp: session.warmUp.map((topic) => ({
            ...topic,
            nextReviewAt: topic.nextReviewAt?.toISOString() ?? null,
          })),
        };
      }),
  );
}
