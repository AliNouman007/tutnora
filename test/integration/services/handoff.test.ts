import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { endSession } from '../../../src/services/handoff';
import { startSession } from '../../../src/services/session';
import { expectAppError } from '../../helpers/errors';
import { NOW, minutesLater, seedGoal } from '../../helpers/repositories';

describe('endSession', () => {
  it('saves a handoff that the next session resumes from', async () => {
    const goal = await seedGoal('1001');

    const handoff = await endSession(
      env.DB,
      '1001',
      {
        goalId: goal.id,
        summary: 'Learned CSS positioning; sticky versus fixed is still shaky.',
        nextStep: 'Revise sticky, then start flexbox.',
        openQuestions: 'When does sticky stop sticking?',
      },
      NOW,
    );
    const session = await startSession(
      env.DB,
      { learnerId: '1001', githubLogin: 'sara' },
      null,
      minutesLater(60),
    );

    expect(session.focusGoal?.id).toBe(goal.id);
    expect(session.lastHandoff).toEqual(handoff);
  });

  it('rejects a goal that does not exist', async () => {
    await seedGoal('1001');

    await expectAppError(
      endSession(
        env.DB,
        '1001',
        { goalId: 'missing-goal', summary: 'Summary.', nextStep: 'Next.', openQuestions: null },
        NOW,
      ),
      'NOT_FOUND',
    );
  });
});
