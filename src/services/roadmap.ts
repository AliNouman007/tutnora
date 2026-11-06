import { createGoal, getGoal } from '../db/goals';
import type { NewGoal } from '../db/goals';
import { getLearner } from '../db/learners';
import { listTopics, upsertTopics } from '../db/topics';
import type { TopicInput } from '../db/topics';
import type { Goal, Topic } from '../domain/entities';
import { AppError } from '../domain/errors';
import { validateRoadmapTopics } from '../domain/roadmap';

export type SaveGoalRoadmapInput =
  | { readonly goalId: string; readonly topics: readonly TopicInput[] }
  | { readonly newGoal: NewGoal; readonly topics: readonly TopicInput[] };

export interface SaveGoalRoadmapResult {
  readonly goal: Goal;
  readonly created: boolean;
  /** All of the goal's topics after the save, in roadmap order. */
  readonly topics: readonly Topic[];
}

/**
 * Creates a goal with its roadmap, or adds and updates topics in an existing goal.
 * Topics are validated before anything is saved. Existing topics that are left out are kept.
 */
export async function saveGoalRoadmap(
  db: D1Database,
  learnerId: string,
  input: SaveGoalRoadmapInput,
  now: Date,
): Promise<SaveGoalRoadmapResult> {
  if ('goalId' in input) {
    const goal = await getGoal(db, learnerId, input.goalId);
    if (goal === null) {
      throw new AppError('NOT_FOUND', 'Goal not found.');
    }
    validateRoadmapTopics(await listTopics(db, learnerId, goal.id), input.topics);
    await upsertTopics(db, learnerId, goal.id, input.topics, now);
    return { goal, created: false, topics: await listTopics(db, learnerId, goal.id) };
  }

  if ((await getLearner(db, learnerId)) === null) {
    throw new AppError('NOT_FOUND', 'Learner profile not found. Call start_session first.');
  }
  validateRoadmapTopics([], input.topics);
  const goal = await createGoal(db, learnerId, input.newGoal, now);
  await upsertTopics(db, learnerId, goal.id, input.topics, now);
  return { goal, created: true, topics: await listTopics(db, learnerId, goal.id) };
}
