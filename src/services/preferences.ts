import { updateLearnerPreferences } from '../db/learners';
import type { LearnerPreferences } from '../db/learners';
import type { Learner } from '../domain/entities';
import { AppError } from '../domain/errors';

/** Saves the learner's teaching preferences. Only the preferences that are given change. */
export async function updatePreferences(
  db: D1Database,
  learnerId: string,
  preferences: LearnerPreferences,
  now: Date,
): Promise<Learner> {
  const learner = await updateLearnerPreferences(db, learnerId, preferences, now);
  if (learner === null) {
    throw new AppError('NOT_FOUND', 'Learner profile not found. Call start_session first.');
  }
  return learner;
}
