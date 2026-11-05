import { env } from 'cloudflare:workers';

// Test-only helpers that insert rows with plain SQL, to exercise the schema directly.
// Application code will read and write through repositories in src/db/ instead.

const TIMESTAMP = '2026-11-05T00:00:00.000Z';

export interface EvidenceRow {
  id: string;
  learnerId: string;
  goalId: string;
  topicId: string;
  requestId?: string;
  note?: string;
}

export async function insertLearner(id: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO learners (id, github_login, created_at, updated_at) VALUES (?, ?, ?, ?)',
  )
    .bind(id, `login-${id}`, TIMESTAMP, TIMESTAMP)
    .run();
}

export async function insertGoal(
  learnerId: string,
  goalId: string,
  purpose = 'interview',
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO goals (id, learner_id, title, purpose, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      goalId,
      learnerId,
      'Frontend interview preparation',
      purpose,
      'topic',
      TIMESTAMP,
      TIMESTAMP,
    )
    .run();
}

export async function insertTopic(
  learnerId: string,
  goalId: string,
  topicId: string,
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO topics (id, learner_id, goal_id, key, title, tier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      topicId,
      learnerId,
      goalId,
      `topic.${topicId}`,
      'CSS positioning',
      'core',
      TIMESTAMP,
      TIMESTAMP,
    )
    .run();
}

export async function insertEvidence(row: EvidenceRow): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO evidence (id, learner_id, goal_id, topic_id, kind, support, result, note, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      row.id,
      row.learnerId,
      row.goalId,
      row.topicId,
      'recall',
      'independent',
      'pass',
      row.note ?? null,
      row.requestId ?? null,
      TIMESTAMP,
    )
    .run();
}

export async function insertHandoff(
  learnerId: string,
  goalId: string,
  handoffId: string,
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO handoffs (id, learner_id, goal_id, summary, next_step, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(handoffId, learnerId, goalId, 'Practised CSS positioning.', 'Review sticky.', TIMESTAMP)
    .run();
}

/** Creates a learner with one goal and one topic, and returns their ids. */
export async function seedLearner(learnerId: string): Promise<{ goalId: string; topicId: string }> {
  const goalId = `goal-${learnerId}`;
  const topicId = `topic-${learnerId}`;
  await insertLearner(learnerId);
  await insertGoal(learnerId, goalId);
  await insertTopic(learnerId, goalId, topicId);
  return { goalId, topicId };
}
