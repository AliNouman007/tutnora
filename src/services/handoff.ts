import { getGoal } from '../db/goals';
import { insertHandoff } from '../db/handoffs';
import type { NewHandoff } from '../db/handoffs';
import type { Handoff } from '../domain/entities';
import { AppError } from '../domain/errors';

/**
 * Ends a session by saving a handoff for the goal: what happened, the next step, and any
 * open questions. The next session for this goal resumes from the latest handoff.
 */
export async function endSession(
  db: D1Database,
  learnerId: string,
  input: NewHandoff,
  now: Date,
): Promise<Handoff> {
  const goal = await getGoal(db, learnerId, input.goalId);
  if (goal === null) {
    throw new AppError('NOT_FOUND', 'Goal not found.');
  }
  return insertHandoff(
    db,
    learnerId,
    {
      goalId: goal.id,
      summary: input.summary,
      nextStep: input.nextStep,
      openQuestions: input.openQuestions,
    },
    now,
  );
}
