import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { insertEvidence } from '../../../src/db/evidence';
import { createGoal } from '../../../src/db/goals';
import { insertHandoff } from '../../../src/db/handoffs';
import { startSession } from '../../../src/services/session';
import { expectAppError } from '../../helpers/errors';
import { NOW, evidenceFor, minutesLater, seedGoal, seedTopic } from '../../helpers/repositories';

const SARA = { learnerId: '1001', githubLogin: 'sara' };
const DAY_MINUTES = 24 * 60;
const AI_GOAL = {
  title: 'AI engineering',
  purpose: 'skill',
  targetLevel: null,
  mode: 'mixed',
} as const;

describe('startSession', () => {
  it('creates the profile on the first session and reports a new learner', async () => {
    const session = await startSession(env.DB, SARA, null, NOW);

    expect(session).toMatchObject({
      isNewLearner: true,
      goals: [],
      focusGoal: null,
      lastHandoff: null,
      warmUp: [],
    });
    expect(session.learner).toMatchObject({ id: '1001', githubLogin: 'sara', language: null });
  });

  it('recognises a returning learner', async () => {
    await startSession(env.DB, SARA, null, NOW);

    const session = await startSession(env.DB, SARA, null, minutesLater(60));

    expect(session.isNewLearner).toBe(false);
  });

  it('focuses on the requested goal', async () => {
    const frontend = await seedGoal('1001');
    await createGoal(env.DB, '1001', AI_GOAL, minutesLater(5));

    const session = await startSession(env.DB, SARA, frontend.id, minutesLater(10));

    expect(session.focusGoal?.id).toBe(frontend.id);
  });

  it('rejects a requested goal that does not exist', async () => {
    await expectAppError(startSession(env.DB, SARA, 'missing-goal', NOW), 'NOT_FOUND');
  });

  it('resumes the goal with the most recent handoff, even if a newer goal exists', async () => {
    const frontend = await seedGoal('1001');
    await createGoal(env.DB, '1001', AI_GOAL, minutesLater(5));
    await insertHandoff(
      env.DB,
      '1001',
      {
        goalId: frontend.id,
        summary: 'Studied CSS positioning.',
        nextStep: 'Start flexbox.',
        openQuestions: null,
      },
      minutesLater(10),
    );

    const session = await startSession(env.DB, SARA, null, minutesLater(20));

    expect(session.focusGoal?.id).toBe(frontend.id);
    expect(session.lastHandoff?.nextStep).toBe('Start flexbox.');
  });

  it('focuses on the newest active goal when there are no handoffs', async () => {
    await seedGoal('1001');
    const ai = await createGoal(env.DB, '1001', AI_GOAL, minutesLater(5));

    const session = await startSession(env.DB, SARA, null, minutesLater(10));

    expect(session.focusGoal?.id).toBe(ai.id);
  });

  it('returns the topics that are due for review as the warm-up', async () => {
    const goal = await seedGoal('1001');
    const position = await seedTopic('1001', goal, 'css.layout.position');
    const grid = await seedTopic('1001', goal, 'css.layout.grid');
    await insertEvidence(env.DB, '1001', evidenceFor(position, { result: 'fail' }), NOW);
    await insertEvidence(env.DB, '1001', evidenceFor(grid), NOW);

    const session = await startSession(env.DB, SARA, goal.id, minutesLater(DAY_MINUTES + 1));

    expect(session.warmUp).toEqual([
      {
        key: 'css.layout.position',
        title: 'Title of css.layout.position',
        tier: 'core',
        status: 'learning',
        nextReviewAt: minutesLater(DAY_MINUTES),
      },
    ]);
  });
});
