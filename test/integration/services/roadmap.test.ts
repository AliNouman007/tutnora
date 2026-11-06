import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { listGoals } from '../../../src/db/goals';
import { upsertLearner } from '../../../src/db/learners';
import { saveGoalRoadmap } from '../../../src/services/roadmap';
import { expectAppError } from '../../helpers/errors';
import { NOW, minutesLater, seedGoal, topicInput } from '../../helpers/repositories';

const NEW_GOAL = {
  title: 'Frontend interview preparation',
  purpose: 'interview',
  targetLevel: 'mid-level',
  mode: 'topic',
} as const;

describe('saveGoalRoadmap', () => {
  it('creates a goal with its roadmap', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    const result = await saveGoalRoadmap(
      env.DB,
      '1001',
      {
        newGoal: NEW_GOAL,
        topics: [
          topicInput('css', { position: 0 }),
          topicInput('css.layout.position', { parentKey: 'css', position: 1 }),
        ],
      },
      NOW,
    );

    expect(result.created).toBe(true);
    expect(result.goal).toMatchObject({
      title: 'Frontend interview preparation',
      status: 'active',
    });
    expect(result.topics.map((topic) => topic.key)).toEqual(['css', 'css.layout.position']);
  });

  it('adds and updates topics in an existing goal and keeps the rest', async () => {
    const goal = await seedGoal('1001');
    await saveGoalRoadmap(
      env.DB,
      '1001',
      {
        goalId: goal.id,
        topics: [topicInput('css'), topicInput('css.grid', { parentKey: 'css' })],
      },
      NOW,
    );

    const result = await saveGoalRoadmap(
      env.DB,
      '1001',
      {
        goalId: goal.id,
        topics: [
          topicInput('css.grid', { parentKey: 'css', title: 'CSS grid layout' }),
          topicInput('css.flexbox', { parentKey: 'css' }),
        ],
      },
      minutesLater(30),
    );

    expect(result.created).toBe(false);
    expect(result.topics.map((topic) => [topic.key, topic.title])).toEqual([
      ['css', 'Title of css'],
      ['css.flexbox', 'Title of css.flexbox'],
      ['css.grid', 'CSS grid layout'],
    ]);
  });

  it('rejects an invalid roadmap without creating the goal', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    await expectAppError(
      saveGoalRoadmap(
        env.DB,
        '1001',
        { newGoal: NEW_GOAL, topics: [topicInput('css.grid', { parentKey: 'css' })] },
        NOW,
      ),
      'VALIDATION',
    );
    expect(await listGoals(env.DB, '1001')).toEqual([]);
  });

  it('rejects a goal that does not exist', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    await expectAppError(
      saveGoalRoadmap(env.DB, '1001', { goalId: 'missing-goal', topics: [] }, NOW),
      'NOT_FOUND',
    );
  });

  it('requires a learner profile before creating a goal', async () => {
    await expectAppError(
      saveGoalRoadmap(env.DB, 'unknown-learner', { newGoal: NEW_GOAL, topics: [] }, NOW),
      'NOT_FOUND',
    );
  });
});
