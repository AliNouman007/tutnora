import { describe, expect, it } from 'vitest';
import { connectAs } from '../helpers/mcp-client';
import { NOW } from '../helpers/repositories';

const clock = () => NOW;
const LEARNER_A = { learnerId: 'learner-a', githubLogin: 'learner-a' };
const LEARNER_B = { learnerId: 'learner-b', githubLogin: 'learner-b' };

describe('tool identity', () => {
  it('rejects a learner id passed as tool input', async () => {
    const client = await connectAs(LEARNER_A, clock);

    const startWithId = await client.call('start_session', { learnerId: 'learner-b' });
    const preferencesWithId = await client.call('update_preferences', {
      learnerId: 'learner-b',
      language: 'english',
    });
    await client.close();

    expect(startWithId.isError).toBe(true);
    expect(preferencesWithId.isError).toBe(true);
  });

  it('keeps two signed-in learners apart', async () => {
    const clientA = await connectAs(LEARNER_A, clock);
    const clientB = await connectAs(LEARNER_B, clock);
    await clientA.callOk('start_session');
    await clientB.callOk('start_session');
    const saved = (await clientA.callOk('save_goal_roadmap', {
      newGoal: { title: 'Frontend', purpose: 'interview', mode: 'topic' },
      topics: [{ key: 'css', title: 'CSS', tier: 'core', position: 0 }],
    })) as { goal: { id: string } };

    const sessionB = await clientB.callOk('start_session');
    const intoGoalA = await clientB.call('save_goal_roadmap', {
      goalId: saved.goal.id,
      topics: [{ key: 'css', title: 'Changed by B', tier: 'core', position: 0 }],
    });
    await clientA.close();
    await clientB.close();

    expect(sessionB).toMatchObject({ goals: [], focusGoal: null });
    expect(intoGoalA.isError).toBe(true);
    expect(intoGoalA.text).toMatch(/^NOT_FOUND:/);
  });
});
