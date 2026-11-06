import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { getLatestLearnerHandoff, insertHandoff } from '../../src/db/handoffs';
import { getTopicByKey } from '../../src/db/topics';
import { saveGoalRoadmap } from '../../src/services/roadmap';
import { startSession } from '../../src/services/session';
import { expectAppError } from '../helpers/errors';
import { NOW, minutesLater, seedGoal, seedTopic, topicInput } from '../helpers/repositories';

const LEARNER_B = { learnerId: 'learner-b', githubLogin: 'learner-b' };

describe('service isolation between learners', () => {
  it("never shows a learner another learner's goals or handoffs", async () => {
    const goalA = await seedGoal('learner-a');
    await insertHandoff(
      env.DB,
      'learner-a',
      { goalId: goalA.id, summary: 'A studied CSS.', nextStep: 'Grid.', openQuestions: null },
      NOW,
    );
    await seedGoal('learner-b');

    const session = await startSession(env.DB, LEARNER_B, null, minutesLater(5));

    expect(session.goals.map((goal) => goal.learnerId)).toEqual(['learner-b']);
    expect(session.lastHandoff).toBeNull();
    expect(await getLatestLearnerHandoff(env.DB, 'learner-b')).toBeNull();
    await expectAppError(startSession(env.DB, LEARNER_B, goalA.id, minutesLater(6)), 'NOT_FOUND');
  });

  it("cannot save a roadmap into another learner's goal", async () => {
    const goalA = await seedGoal('learner-a');
    await seedTopic('learner-a', goalA, 'css.layout.position');
    await seedGoal('learner-b');

    await expectAppError(
      saveGoalRoadmap(
        env.DB,
        'learner-b',
        {
          goalId: goalA.id,
          topics: [topicInput('css.layout.position', { title: 'Changed by B' })],
        },
        NOW,
      ),
      'NOT_FOUND',
    );
    expect((await getTopicByKey(env.DB, 'learner-a', goalA.id, 'css.layout.position'))?.title).toBe(
      'Title of css.layout.position',
    );
  });
});
