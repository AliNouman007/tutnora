import { listEvidenceForGoal } from '../db/evidence';
import { listTopics } from '../db/topics';
import type { Evidence, Topic } from '../domain/entities';
import { deriveTopicProgress } from '../domain/progress';
import type { TopicProgress } from '../domain/progress';

export interface TopicWithProgress {
  readonly topic: Topic;
  readonly progress: TopicProgress;
}

/** Loads a goal's topics in roadmap order, each with progress derived from its evidence. */
export async function loadTopicProgress(
  db: D1Database,
  learnerId: string,
  goalId: string,
): Promise<TopicWithProgress[]> {
  const [topics, evidence] = await Promise.all([
    listTopics(db, learnerId, goalId),
    listEvidenceForGoal(db, learnerId, goalId),
  ]);

  const evidenceByTopic = new Map<string, Evidence[]>();
  for (const entry of evidence) {
    const entries = evidenceByTopic.get(entry.topicId) ?? [];
    entries.push(entry);
    evidenceByTopic.set(entry.topicId, entries);
  }

  return topics.map((topic) => ({
    topic,
    progress: deriveTopicProgress(evidenceByTopic.get(topic.id) ?? []),
  }));
}
