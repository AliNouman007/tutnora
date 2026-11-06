import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createGoal } from '../../../src/db/goals';
import { getLatestLearnerHandoff, insertHandoff } from '../../../src/db/handoffs';
import { NOW, minutesLater, seedGoal } from '../../helpers/repositories';

describe('getLatestLearnerHandoff', () => {
  it('returns null when the learner has no handoffs', async () => {
    await seedGoal('1001');

    expect(await getLatestLearnerHandoff(env.DB, '1001')).toBeNull();
  });

  it("returns the most recent handoff across all of the learner's goals", async () => {
    const frontend = await seedGoal('1001');
    const ai = await createGoal(
      env.DB,
      '1001',
      { title: 'AI engineering', purpose: 'skill', targetLevel: null, mode: 'mixed' },
      NOW,
    );
    await insertHandoff(
      env.DB,
      '1001',
      { goalId: ai.id, summary: 'Studied prompts.', nextStep: 'RAG.', openQuestions: null },
      minutesLater(10),
    );
    await insertHandoff(
      env.DB,
      '1001',
      { goalId: frontend.id, summary: 'Studied CSS.', nextStep: 'Grid.', openQuestions: null },
      minutesLater(20),
    );

    expect((await getLatestLearnerHandoff(env.DB, '1001'))?.goalId).toBe(frontend.id);
  });
});
