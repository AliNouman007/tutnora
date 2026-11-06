import { describe, expect, it } from 'vitest';
import { connectAs } from '../helpers/mcp-client';
import { NOW } from '../helpers/repositories';

const clock = () => NOW;
const LEARNER_A = { learnerId: 'learner-a', githubLogin: 'learner-a' };
const LEARNER_B = { learnerId: 'learner-b', githubLogin: 'learner-b' };

describe('learning tool identity', () => {
  it("cannot use another learner's goal in the learning tools", async () => {
    const clientA = await connectAs(LEARNER_A, clock);
    const clientB = await connectAs(LEARNER_B, clock);
    await clientA.callOk('start_session');
    await clientB.callOk('start_session');
    const saved = (await clientA.callOk('save_goal_roadmap', {
      newGoal: { title: 'Frontend', purpose: 'interview', mode: 'topic' },
      topics: [{ key: 'css', title: 'CSS', tier: 'core', position: 0 }],
    })) as { goal: { id: string } };
    const goalId = saved.goal.id;

    const evidence = await clientB.call('record_evidence', {
      goalId,
      topicKey: 'css',
      kind: 'recall',
      support: 'independent',
      result: 'pass',
    });
    const ended = await clientB.call('end_session', {
      goalId,
      summary: 'Not mine.',
      nextStep: 'None.',
    });
    const progress = await clientB.call('get_progress', { goalId });
    await clientA.close();
    await clientB.close();

    for (const outcome of [evidence, ended, progress]) {
      expect(outcome.isError).toBe(true);
      expect(outcome.text).toMatch(/^NOT_FOUND:/);
    }
  });

  it('rejects a learner id passed to the learning tools', async () => {
    const client = await connectAs(LEARNER_A, clock);
    await client.callOk('start_session');

    const outcome = await client.call('get_progress', {
      goalId: 'any-goal',
      learnerId: 'learner-b',
    });
    await client.close();

    expect(outcome.isError).toBe(true);
  });
});
