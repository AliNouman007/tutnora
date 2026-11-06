import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { AppError } from '../../domain/errors';
import { COLLECTION_LIMITS, TEXT_LIMITS } from '../../domain/limits';
import { GOAL_MODES, GOAL_PURPOSES, TOPIC_TIERS } from '../../domain/types';
import { saveGoalRoadmap } from '../../services/roadmap';
import type { SaveGoalRoadmapInput } from '../../services/roadmap';
import type { ToolContext } from '../context';
import { presentGoal, presentTopic } from '../present';
import { runTool } from '../results';

const topicSchema = z.strictObject({
  key: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.topicKey)
    .describe('Dot-path key, lowercase, for example css.layout.position'),
  parentKey: z.string().min(1).max(TEXT_LIMITS.topicKey).nullable().optional(),
  title: z.string().min(1).max(TEXT_LIMITS.topicTitle),
  tier: z.enum(TOPIC_TIERS),
  position: z.number().int().min(0).max(10_000).describe('Order among siblings'),
  sources: z
    .array(z.url({ protocol: /^https?$/ }).max(TEXT_LIMITS.sourceUrl))
    .max(COLLECTION_LIMITS.sourcesPerTopic)
    .optional(),
});

const newGoalSchema = z.strictObject({
  title: z.string().min(1).max(TEXT_LIMITS.goalTitle),
  purpose: z.enum(GOAL_PURPOSES),
  targetLevel: z.string().min(1).max(TEXT_LIMITS.goalTargetLevel).nullable().optional(),
  mode: z.enum(GOAL_MODES),
});

const inputSchema = z.strictObject({
  goalId: z.string().min(1).max(TEXT_LIMITS.id).optional(),
  newGoal: newGoalSchema.optional(),
  topics: z.array(topicSchema).max(COLLECTION_LIMITS.topicsPerSave),
});

type Input = z.infer<typeof inputSchema>;

function toServiceInput(input: Input): SaveGoalRoadmapInput {
  const topics = input.topics.map((topic) => ({
    key: topic.key,
    parentKey: topic.parentKey ?? null,
    title: topic.title,
    tier: topic.tier,
    position: topic.position,
    sources: topic.sources ?? [],
  }));
  if (input.goalId !== undefined && input.newGoal === undefined) {
    return { goalId: input.goalId, topics };
  }
  if (input.newGoal !== undefined && input.goalId === undefined) {
    return {
      newGoal: {
        title: input.newGoal.title,
        purpose: input.newGoal.purpose,
        targetLevel: input.newGoal.targetLevel ?? null,
        mode: input.newGoal.mode,
      },
      topics,
    };
  }
  throw new AppError('VALIDATION', 'Provide exactly one of goalId or newGoal.');
}

export function registerSaveGoalRoadmap(server: McpServer, context: ToolContext): void {
  server.registerTool(
    'save_goal_roadmap',
    {
      description:
        'Creates a new goal with its roadmap (pass newGoal), or adds and updates topics in an existing goal (pass goalId). Topics are matched by key; topics left out are kept. Every parentKey must exist in the roadmap or in the same call. Nothing is saved if any topic is invalid.',
      inputSchema,
    },
    (input) =>
      runTool('save_goal_roadmap', async () => {
        const result = await saveGoalRoadmap(
          context.db,
          context.identity.learnerId,
          toServiceInput(input),
          context.now(),
        );
        return {
          created: result.created,
          goal: presentGoal(result.goal),
          topics: result.topics.map(presentTopic),
        };
      }),
  );
}
