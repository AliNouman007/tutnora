import { getGoal } from '../db/goals';
import type { Goal } from '../domain/entities';
import { AppError } from '../domain/errors';
import { isDue } from '../domain/progress';
import type { TopicStatus, TopicTier } from '../domain/types';
import { loadTopicProgress } from './topic-progress';

export interface TopicProgressSummary {
  readonly key: string;
  readonly parentKey: string | null;
  readonly title: string;
  readonly tier: TopicTier;
  readonly status: TopicStatus;
  readonly nextReviewAt: Date | null;
  readonly due: boolean;
}

export interface GoalProgress {
  readonly goal: Goal;
  readonly statusCounts: Readonly<Record<TopicStatus, number>>;
  readonly dueCount: number;
  readonly topics: readonly TopicProgressSummary[];
}

/** Summarises a goal's progress: each topic's status and next review, and totals by status. */
export async function getProgress(
  db: D1Database,
  learnerId: string,
  goalId: string,
  now: Date,
): Promise<GoalProgress> {
  const goal = await getGoal(db, learnerId, goalId);
  if (goal === null) {
    throw new AppError('NOT_FOUND', 'Goal not found.');
  }

  const topics = (await loadTopicProgress(db, learnerId, goal.id)).map(({ topic, progress }) => ({
    key: topic.key,
    parentKey: topic.parentKey,
    title: topic.title,
    tier: topic.tier,
    status: progress.status,
    nextReviewAt: progress.nextReviewAt,
    due: isDue(progress, now),
  }));

  const statusCounts: Record<TopicStatus, number> = {
    not_started: 0,
    learning: 0,
    practised: 0,
    demonstrated: 0,
    needs_revision: 0,
  };
  for (const topic of topics) {
    statusCounts[topic.status] += 1;
  }

  return {
    goal,
    statusCounts,
    dueCount: topics.filter((topic) => topic.due).length,
    topics,
  };
}
