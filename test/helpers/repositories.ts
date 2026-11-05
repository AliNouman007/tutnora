import { env } from 'cloudflare:workers';
import type { NewEvidence } from '../../src/db/evidence';
import { createGoal } from '../../src/db/goals';
import { upsertLearner } from '../../src/db/learners';
import { getTopicByKey, upsertTopics } from '../../src/db/topics';
import type { TopicInput } from '../../src/db/topics';
import type { Goal, Topic } from '../../src/domain/entities';

export const NOW = new Date('2026-11-05T10:00:00.000Z');

export function minutesLater(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

export function topicInput(key: string, overrides: Partial<TopicInput> = {}): TopicInput {
  return {
    key,
    parentKey: null,
    title: `Title of ${key}`,
    tier: 'core',
    position: 0,
    sources: [],
    ...overrides,
  };
}

export function evidenceFor(topic: Topic, overrides: Partial<NewEvidence> = {}): NewEvidence {
  return {
    goalId: topic.goalId,
    topicId: topic.id,
    kind: 'recall',
    support: 'independent',
    result: 'pass',
    note: null,
    requestId: null,
    ...overrides,
  };
}

/** Creates a learner and a frontend goal for them. */
export async function seedGoal(learnerId: string): Promise<Goal> {
  await upsertLearner(env.DB, learnerId, `login-${learnerId}`, NOW);
  return createGoal(
    env.DB,
    learnerId,
    {
      title: 'Frontend interview preparation',
      purpose: 'interview',
      targetLevel: 'mid-level',
      mode: 'topic',
    },
    NOW,
  );
}

export async function seedTopic(
  learnerId: string,
  goal: Goal,
  key = 'css.layout.position',
): Promise<Topic> {
  await upsertTopics(env.DB, learnerId, goal.id, [topicInput(key)], NOW);
  const topic = await getTopicByKey(env.DB, learnerId, goal.id, key);
  if (topic === null) {
    throw new Error(`Test setup failed: topic ${key} was not saved.`);
  }
  return topic;
}
