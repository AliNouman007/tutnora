import type { Handoff } from '../domain/entities';
import { requireRow } from './rows';

interface HandoffRow {
  id: string;
  learner_id: string;
  goal_id: string;
  summary: string;
  next_step: string;
  open_questions: string | null;
  created_at: string;
}

export interface NewHandoff {
  readonly goalId: string;
  readonly summary: string;
  readonly nextStep: string;
  readonly openQuestions: string | null;
}

function toHandoff(row: HandoffRow): Handoff {
  return {
    id: row.id,
    learnerId: row.learner_id,
    goalId: row.goal_id,
    summary: row.summary,
    nextStep: row.next_step,
    openQuestions: row.open_questions,
    createdAt: new Date(row.created_at),
  };
}

export async function insertHandoff(
  db: D1Database,
  learnerId: string,
  handoff: NewHandoff,
  now: Date,
): Promise<Handoff> {
  const row = await db
    .prepare(
      `INSERT INTO handoffs (id, learner_id, goal_id, summary, next_step, open_questions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    )
    .bind(
      crypto.randomUUID(),
      learnerId,
      handoff.goalId,
      handoff.summary,
      handoff.nextStep,
      handoff.openQuestions,
      now.toISOString(),
    )
    .first<HandoffRow>();
  return toHandoff(requireRow(row));
}

/** Returns the most recently saved handoff for a goal, or null if there is none. */
export async function getLatestHandoff(
  db: D1Database,
  learnerId: string,
  goalId: string,
): Promise<Handoff | null> {
  const row = await db
    .prepare(
      `SELECT * FROM handoffs WHERE learner_id = ? AND goal_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    )
    .bind(learnerId, goalId)
    .first<HandoffRow>();
  return row === null ? null : toHandoff(row);
}

/** Returns the learner's most recently saved handoff across all goals, or null if there is none. */
export async function getLatestLearnerHandoff(
  db: D1Database,
  learnerId: string,
): Promise<Handoff | null> {
  const row = await db
    .prepare(
      `SELECT * FROM handoffs WHERE learner_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    )
    .bind(learnerId)
    .first<HandoffRow>();
  return row === null ? null : toHandoff(row);
}
