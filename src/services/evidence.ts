import { findEvidenceByRequestId, insertEvidence, listEvidenceForTopic } from '../db/evidence';
import { getGoal } from '../db/goals';
import { getTopicByKey } from '../db/topics';
import type { Evidence, Topic } from '../domain/entities';
import { AppError } from '../domain/errors';
import { deriveTopicProgress } from '../domain/progress';
import type { TopicProgress } from '../domain/progress';
import type { EvidenceKind, EvidenceResult, EvidenceSupport } from '../domain/types';

export interface RecordEvidenceInput {
  readonly goalId: string;
  readonly topicKey: string;
  readonly kind: EvidenceKind;
  readonly support: EvidenceSupport;
  readonly result: EvidenceResult;
  readonly note: string | null;
  /** Optional key that makes retries safe: the same request id is recorded only once. */
  readonly requestId: string | null;
}

export interface RecordEvidenceResult {
  readonly evidence: Evidence;
  readonly topicKey: string;
  /** The topic's progress after this evidence, derived by the rules in ADR 0003. */
  readonly progress: TopicProgress;
  /** True when this request id was already recorded and nothing new was saved. */
  readonly duplicate: boolean;
}

/**
 * Records one assessment result for one topic and returns the topic's updated progress.
 * A repeated request id returns the original result instead of saving a duplicate.
 */
export async function recordEvidence(
  db: D1Database,
  learnerId: string,
  input: RecordEvidenceInput,
  now: Date,
): Promise<RecordEvidenceResult> {
  const goal = await getGoal(db, learnerId, input.goalId);
  if (goal === null) {
    throw new AppError('NOT_FOUND', 'Goal not found.');
  }
  const topic = await getTopicByKey(db, learnerId, goal.id, input.topicKey);
  if (topic === null) {
    throw new AppError('NOT_FOUND', `Topic "${input.topicKey}" not found in this goal.`);
  }

  if (input.requestId !== null) {
    const existing = await findEvidenceByRequestId(db, learnerId, input.requestId);
    if (existing !== null) {
      if (existing.topicId !== topic.id) {
        throw new AppError('CONFLICT', 'This request id was already used for a different topic.');
      }
      return {
        evidence: existing,
        topicKey: topic.key,
        progress: await progressFor(db, learnerId, topic),
        duplicate: true,
      };
    }
  }

  const evidence = await insertEvidence(
    db,
    learnerId,
    {
      goalId: goal.id,
      topicId: topic.id,
      kind: input.kind,
      support: input.support,
      result: input.result,
      note: input.note,
      requestId: input.requestId,
    },
    now,
  );
  return {
    evidence,
    topicKey: topic.key,
    progress: await progressFor(db, learnerId, topic),
    duplicate: false,
  };
}

async function progressFor(
  db: D1Database,
  learnerId: string,
  topic: Topic,
): Promise<TopicProgress> {
  return deriveTopicProgress(await listEvidenceForTopic(db, learnerId, topic.id));
}
