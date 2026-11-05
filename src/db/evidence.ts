import type { Evidence } from '../domain/entities';
import type { EvidenceKind, EvidenceResult, EvidenceSupport } from '../domain/types';
import { requireRow } from './rows';

interface EvidenceRow {
  id: string;
  learner_id: string;
  goal_id: string;
  topic_id: string;
  kind: EvidenceKind;
  support: EvidenceSupport;
  result: EvidenceResult;
  note: string | null;
  request_id: string | null;
  created_at: string;
}

export interface NewEvidence {
  readonly goalId: string;
  readonly topicId: string;
  readonly kind: EvidenceKind;
  readonly support: EvidenceSupport;
  readonly result: EvidenceResult;
  readonly note: string | null;
  readonly requestId: string | null;
}

function toEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    learnerId: row.learner_id,
    goalId: row.goal_id,
    topicId: row.topic_id,
    kind: row.kind,
    support: row.support,
    result: row.result,
    note: row.note,
    requestId: row.request_id,
    createdAt: new Date(row.created_at),
  };
}

/** Records one assessment result. Evidence is append-only and never edited. */
export async function insertEvidence(
  db: D1Database,
  learnerId: string,
  evidence: NewEvidence,
  now: Date,
): Promise<Evidence> {
  const row = await db
    .prepare(
      `INSERT INTO evidence
         (id, learner_id, goal_id, topic_id, kind, support, result, note, request_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    )
    .bind(
      crypto.randomUUID(),
      learnerId,
      evidence.goalId,
      evidence.topicId,
      evidence.kind,
      evidence.support,
      evidence.result,
      evidence.note,
      evidence.requestId,
      now.toISOString(),
    )
    .first<EvidenceRow>();
  return toEvidence(requireRow(row));
}

/** Finds evidence saved with a request id, so a retried call does not create a duplicate. */
export async function findEvidenceByRequestId(
  db: D1Database,
  learnerId: string,
  requestId: string,
): Promise<Evidence | null> {
  const row = await db
    .prepare('SELECT * FROM evidence WHERE learner_id = ? AND request_id = ?')
    .bind(learnerId, requestId)
    .first<EvidenceRow>();
  return row === null ? null : toEvidence(row);
}

/** Lists a topic's evidence, oldest first. */
export async function listEvidenceForTopic(
  db: D1Database,
  learnerId: string,
  topicId: string,
): Promise<Evidence[]> {
  const { results } = await db
    .prepare('SELECT * FROM evidence WHERE learner_id = ? AND topic_id = ? ORDER BY created_at, id')
    .bind(learnerId, topicId)
    .all<EvidenceRow>();
  return results.map(toEvidence);
}

/** Lists all evidence for a goal's topics, oldest first. */
export async function listEvidenceForGoal(
  db: D1Database,
  learnerId: string,
  goalId: string,
): Promise<Evidence[]> {
  const { results } = await db
    .prepare('SELECT * FROM evidence WHERE learner_id = ? AND goal_id = ? ORDER BY created_at, id')
    .bind(learnerId, goalId)
    .all<EvidenceRow>();
  return results.map(toEvidence);
}
