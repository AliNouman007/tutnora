import { listGoals } from '../db/goals';
import { getLatestHandoff, getLatestLearnerHandoff } from '../db/handoffs';
import { getLearner, upsertLearner } from '../db/learners';
import type { Goal, Handoff, Learner } from '../domain/entities';
import { AppError } from '../domain/errors';
import type { TopicStatus, TopicTier } from '../domain/types';
import { selectWarmUpTopics } from '../domain/warm-up';
import { loadTopicProgress } from './topic-progress';

/** Who is calling, as established by sign-in. */
export interface LearnerIdentity {
  readonly learnerId: string;
  readonly githubLogin: string;
}

export interface WarmUpTopic {
  readonly key: string;
  readonly title: string;
  readonly tier: TopicTier;
  readonly status: TopicStatus;
  readonly nextReviewAt: Date | null;
}

export interface StartSessionResult {
  readonly learner: Learner;
  /** True on the learner's first session, so the tutor knows to run onboarding. */
  readonly isNewLearner: boolean;
  readonly goals: readonly Goal[];
  readonly focusGoal: Goal | null;
  readonly lastHandoff: Handoff | null;
  readonly warmUp: readonly WarmUpTopic[];
}

/**
 * Starts a tutoring session. Creates the learner's profile on first use (or refreshes their
 * GitHub login), chooses the goal to focus on, and returns that goal's latest handoff and up to
 * three topics to revise.
 *
 * Focus goal: the requested goal; otherwise the goal with the most recent handoff; otherwise the
 * newest active goal.
 */
export async function startSession(
  db: D1Database,
  identity: LearnerIdentity,
  requestedGoalId: string | null,
  now: Date,
): Promise<StartSessionResult> {
  const existing = await getLearner(db, identity.learnerId);
  const learner = await upsertLearner(db, identity.learnerId, identity.githubLogin, now);
  const goals = await listGoals(db, learner.id);
  const focusGoal = await chooseFocusGoal(db, learner.id, goals, requestedGoalId);
  const base = { learner, isNewLearner: existing === null, goals, focusGoal };

  if (focusGoal === null) {
    return { ...base, lastHandoff: null, warmUp: [] };
  }

  const [lastHandoff, topics] = await Promise.all([
    getLatestHandoff(db, learner.id, focusGoal.id),
    loadTopicProgress(db, learner.id, focusGoal.id),
  ]);
  const titles = new Map(topics.map(({ topic }) => [topic.key, topic.title] as const));
  const selected = selectWarmUpTopics(
    topics.map(({ topic, progress }) => ({ topicKey: topic.key, tier: topic.tier, progress })),
    now,
  );
  const warmUp = selected.map((candidate) => ({
    key: candidate.topicKey,
    title: titles.get(candidate.topicKey) ?? candidate.topicKey,
    tier: candidate.tier,
    status: candidate.progress.status,
    nextReviewAt: candidate.progress.nextReviewAt,
  }));

  return { ...base, lastHandoff, warmUp };
}

async function chooseFocusGoal(
  db: D1Database,
  learnerId: string,
  goals: readonly Goal[],
  requestedGoalId: string | null,
): Promise<Goal | null> {
  if (requestedGoalId !== null) {
    const requested = goals.find((goal) => goal.id === requestedGoalId);
    if (requested === undefined) {
      throw new AppError('NOT_FOUND', 'Goal not found.');
    }
    return requested;
  }

  const latestHandoff = await getLatestLearnerHandoff(db, learnerId);
  const resumed = goals.find((goal) => goal.id === latestHandoff?.goalId);
  if (resumed !== undefined) {
    return resumed;
  }

  return goals.filter((goal) => goal.status === 'active').at(-1) ?? null;
}
