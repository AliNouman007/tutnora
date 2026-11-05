import type { Topic } from '../domain/entities';
import type { TopicTier } from '../domain/types';
import { parseSources } from './rows';

interface TopicRow {
  id: string;
  learner_id: string;
  goal_id: string;
  key: string;
  parent_key: string | null;
  title: string;
  tier: TopicTier;
  position: number;
  sources: string;
  created_at: string;
  updated_at: string;
}

export interface TopicInput {
  readonly key: string;
  readonly parentKey: string | null;
  readonly title: string;
  readonly tier: TopicTier;
  readonly position: number;
  readonly sources: readonly string[];
}

function toTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    learnerId: row.learner_id,
    goalId: row.goal_id,
    key: row.key,
    parentKey: row.parent_key,
    title: row.title,
    tier: row.tier,
    position: row.position,
    sources: parseSources(row.sources),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Adds new topics and updates existing ones, matched by key within the goal.
 * Topics left out of the list are kept, so a roadmap update never deletes learning history.
 * All changes are saved together, or none are.
 */
export async function upsertTopics(
  db: D1Database,
  learnerId: string,
  goalId: string,
  topics: readonly TopicInput[],
  now: Date,
): Promise<void> {
  if (topics.length === 0) {
    return;
  }
  const timestamp = now.toISOString();
  const statement = db.prepare(
    `INSERT INTO topics
       (id, learner_id, goal_id, key, parent_key, title, tier, position, sources, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (goal_id, key) DO UPDATE SET
       parent_key = excluded.parent_key,
       title = excluded.title,
       tier = excluded.tier,
       position = excluded.position,
       sources = excluded.sources,
       updated_at = excluded.updated_at
     WHERE topics.learner_id = excluded.learner_id`,
  );
  await db.batch(
    topics.map((topic) =>
      statement.bind(
        crypto.randomUUID(),
        learnerId,
        goalId,
        topic.key,
        topic.parentKey,
        topic.title,
        topic.tier,
        topic.position,
        JSON.stringify(topic.sources),
        timestamp,
        timestamp,
      ),
    ),
  );
}

/** Lists a goal's topics in roadmap order. */
export async function listTopics(
  db: D1Database,
  learnerId: string,
  goalId: string,
): Promise<Topic[]> {
  const { results } = await db
    .prepare('SELECT * FROM topics WHERE learner_id = ? AND goal_id = ? ORDER BY position, key')
    .bind(learnerId, goalId)
    .all<TopicRow>();
  return results.map(toTopic);
}

export async function getTopicByKey(
  db: D1Database,
  learnerId: string,
  goalId: string,
  key: string,
): Promise<Topic | null> {
  const row = await db
    .prepare('SELECT * FROM topics WHERE learner_id = ? AND goal_id = ? AND key = ?')
    .bind(learnerId, goalId, key)
    .first<TopicRow>();
  return row === null ? null : toTopic(row);
}
