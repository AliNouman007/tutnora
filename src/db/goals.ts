import type { Goal } from '../domain/entities';
import type { GoalMode, GoalPurpose, GoalStatus } from '../domain/types';
import { requireRow } from './rows';

interface GoalRow {
  id: string;
  learner_id: string;
  title: string;
  purpose: GoalPurpose;
  target_level: string | null;
  mode: GoalMode;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface NewGoal {
  readonly title: string;
  readonly purpose: GoalPurpose;
  readonly targetLevel: string | null;
  readonly mode: GoalMode;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    learnerId: row.learner_id,
    title: row.title,
    purpose: row.purpose,
    targetLevel: row.target_level,
    mode: row.mode,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** Creates an active goal. The learner's other goals are not changed. */
export async function createGoal(
  db: D1Database,
  learnerId: string,
  goal: NewGoal,
  now: Date,
): Promise<Goal> {
  const timestamp = now.toISOString();
  const row = await db
    .prepare(
      `INSERT INTO goals
         (id, learner_id, title, purpose, target_level, mode, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
       RETURNING *`,
    )
    .bind(
      crypto.randomUUID(),
      learnerId,
      goal.title,
      goal.purpose,
      goal.targetLevel,
      goal.mode,
      timestamp,
      timestamp,
    )
    .first<GoalRow>();
  return toGoal(requireRow(row));
}

export async function getGoal(
  db: D1Database,
  learnerId: string,
  goalId: string,
): Promise<Goal | null> {
  const row = await db
    .prepare('SELECT * FROM goals WHERE learner_id = ? AND id = ?')
    .bind(learnerId, goalId)
    .first<GoalRow>();
  return row === null ? null : toGoal(row);
}

/** Lists the learner's goals, oldest first. */
export async function listGoals(db: D1Database, learnerId: string): Promise<Goal[]> {
  const { results } = await db
    .prepare('SELECT * FROM goals WHERE learner_id = ? ORDER BY created_at, rowid')
    .bind(learnerId)
    .all<GoalRow>();
  return results.map(toGoal);
}
