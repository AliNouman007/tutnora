import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createGoal, getGoal, listGoals } from '../../../src/db/goals';
import { upsertLearner } from '../../../src/db/learners';
import { NOW, minutesLater, seedGoal } from '../../helpers/repositories';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('goals repository', () => {
  it('creates an active goal and reads it back', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    const goal = await createGoal(
      env.DB,
      '1001',
      {
        title: 'Frontend interview preparation',
        purpose: 'interview',
        targetLevel: null,
        mode: 'topic',
      },
      NOW,
    );

    expect(goal.id).toMatch(UUID);
    expect(goal).toMatchObject({
      learnerId: '1001',
      title: 'Frontend interview preparation',
      status: 'active',
      createdAt: NOW,
    });
    expect(await getGoal(env.DB, '1001', goal.id)).toEqual(goal);
  });

  it('keeps earlier goals unchanged when a new goal is created', async () => {
    const frontend = await seedGoal('1001');

    const aiEngineering = await createGoal(
      env.DB,
      '1001',
      { title: 'AI engineering', purpose: 'skill', targetLevel: null, mode: 'mixed' },
      minutesLater(10),
    );

    expect(await listGoals(env.DB, '1001')).toEqual([frontend, aiEngineering]);
  });

  it('returns null for a goal that does not exist', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    expect(await getGoal(env.DB, '1001', 'missing')).toBeNull();
  });
});
