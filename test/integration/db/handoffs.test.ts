import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { getLatestHandoff, insertHandoff } from '../../../src/db/handoffs';
import type { NewHandoff } from '../../../src/db/handoffs';
import { NOW, minutesLater, seedGoal } from '../../helpers/repositories';

function handoff(goalId: string, summary: string): NewHandoff {
  return { goalId, summary, nextStep: 'Review sticky positioning.', openQuestions: null };
}

describe('handoffs repository', () => {
  it('returns null when a goal has no handoff', async () => {
    const goal = await seedGoal('1001');

    expect(await getLatestHandoff(env.DB, '1001', goal.id)).toBeNull();
  });

  it('returns the most recent handoff', async () => {
    const goal = await seedGoal('1001');
    await insertHandoff(env.DB, '1001', handoff(goal.id, 'First session.'), NOW);
    const latest = await insertHandoff(
      env.DB,
      '1001',
      handoff(goal.id, 'Second session.'),
      minutesLater(30),
    );

    expect(await getLatestHandoff(env.DB, '1001', goal.id)).toEqual(latest);
  });

  it('returns the last saved handoff when two share the same time', async () => {
    const goal = await seedGoal('1001');
    await insertHandoff(env.DB, '1001', handoff(goal.id, 'Saved first.'), NOW);
    await insertHandoff(env.DB, '1001', handoff(goal.id, 'Saved second.'), NOW);

    expect((await getLatestHandoff(env.DB, '1001', goal.id))?.summary).toBe('Saved second.');
  });
});
