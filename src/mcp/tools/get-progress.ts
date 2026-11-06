import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { TEXT_LIMITS } from '../../domain/limits';
import { getProgress } from '../../services/progress';
import type { ToolContext } from '../context';
import { presentGoal } from '../present';
import { runTool } from '../results';

const inputSchema = z.strictObject({
  goalId: z.string().min(1).max(TEXT_LIMITS.id),
});

export function registerGetProgress(server: McpServer, context: ToolContext): void {
  server.registerTool(
    'get_progress',
    {
      description:
        "Shows a goal's progress: each topic's status, next review date, and whether it is due now, plus totals by status. Use it when the learner asks how they are doing, or to plan what to study next.",
      inputSchema,
    },
    ({ goalId }) =>
      runTool('get_progress', async () => {
        const progress = await getProgress(
          context.db,
          context.identity.learnerId,
          goalId,
          context.now(),
        );
        return {
          goal: presentGoal(progress.goal),
          statusCounts: progress.statusCounts,
          dueCount: progress.dueCount,
          topics: progress.topics.map((topic) => ({
            ...topic,
            nextReviewAt: topic.nextReviewAt?.toISOString() ?? null,
          })),
        };
      }),
  );
}
