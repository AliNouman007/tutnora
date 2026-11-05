import type { Learner } from '../domain/entities';
import { requireRow } from './rows';

interface LearnerRow {
  id: string;
  github_login: string;
  language: string | null;
  hint_limit: number;
  session_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface LearnerPreferences {
  readonly language?: string;
  readonly hintLimit?: number;
  readonly sessionMinutes?: number;
}

function toLearner(row: LearnerRow): Learner {
  return {
    id: row.id,
    githubLogin: row.github_login,
    language: row.language,
    hintLimit: row.hint_limit,
    sessionMinutes: row.session_minutes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getLearner(db: D1Database, learnerId: string): Promise<Learner | null> {
  const row = await db
    .prepare('SELECT * FROM learners WHERE id = ?')
    .bind(learnerId)
    .first<LearnerRow>();
  return row === null ? null : toLearner(row);
}

/** Creates the learner on first sign-in, or refreshes their GitHub login on later sign-ins. */
export async function upsertLearner(
  db: D1Database,
  learnerId: string,
  githubLogin: string,
  now: Date,
): Promise<Learner> {
  const timestamp = now.toISOString();
  const row = await db
    .prepare(
      `INSERT INTO learners (id, github_login, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         github_login = excluded.github_login,
         updated_at = excluded.updated_at
       RETURNING *`,
    )
    .bind(learnerId, githubLogin, timestamp, timestamp)
    .first<LearnerRow>();
  return toLearner(requireRow(row));
}

/** Updates only the preferences that are given. Returns null if the learner does not exist. */
export async function updateLearnerPreferences(
  db: D1Database,
  learnerId: string,
  preferences: LearnerPreferences,
  now: Date,
): Promise<Learner | null> {
  const row = await db
    .prepare(
      `UPDATE learners SET
         language = COALESCE(?, language),
         hint_limit = COALESCE(?, hint_limit),
         session_minutes = COALESCE(?, session_minutes),
         updated_at = ?
       WHERE id = ?
       RETURNING *`,
    )
    .bind(
      preferences.language ?? null,
      preferences.hintLimit ?? null,
      preferences.sessionMinutes ?? null,
      now.toISOString(),
      learnerId,
    )
    .first<LearnerRow>();
  return row === null ? null : toLearner(row);
}
