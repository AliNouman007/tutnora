import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectAs } from '../helpers/mcp-client';
import type { TestClient } from '../helpers/mcp-client';
import { NOW } from '../helpers/repositories';

const SARA = { learnerId: '1001', githubLogin: 'sara' };
const clock = () => NOW;

const NEW_GOAL = {
  title: 'Frontend interview preparation',
  purpose: 'interview',
  targetLevel: 'mid-level',
  mode: 'topic',
};

describe('session tools', () => {
  let client: TestClient;

  beforeEach(async () => {
    client = await connectAs(SARA, clock);
  });

  afterEach(async () => {
    await client.close();
  });

  it('lists the session tools', async () => {
    expect(await client.listTools()).toEqual(
      expect.arrayContaining(['start_session', 'save_goal_roadmap', 'update_preferences']),
    );
  });

  it('starts a first session for a new learner', async () => {
    expect(await client.callOk('start_session')).toEqual({
      isNewLearner: true,
      learner: { githubLogin: 'sara', language: null, hintLimit: 3, sessionMinutes: 40 },
      goals: [],
      focusGoal: null,
      lastHandoff: null,
      warmUp: [],
    });
  });

  it('saves a new goal with its roadmap and focuses on it in the next session', async () => {
    await client.callOk('start_session');

    const saved = await client.callOk('save_goal_roadmap', {
      newGoal: NEW_GOAL,
      topics: [
        { key: 'css', title: 'CSS', tier: 'core', position: 0 },
        {
          key: 'css.layout.position',
          parentKey: 'css',
          title: 'CSS positioning',
          tier: 'core',
          position: 1,
          sources: ['https://developer.mozilla.org/en-US/docs/Web/CSS/position'],
        },
      ],
    });

    expect(saved).toMatchObject({
      created: true,
      goal: { title: 'Frontend interview preparation', status: 'active' },
      topics: [
        { key: 'css', parentKey: null, sources: [] },
        { key: 'css.layout.position', parentKey: 'css' },
      ],
    });
    expect(await client.callOk('start_session')).toMatchObject({
      isNewLearner: false,
      focusGoal: { title: 'Frontend interview preparation' },
    });
  });

  it('requires exactly one of goalId or newGoal', async () => {
    await client.callOk('start_session');

    const outcome = await client.call('save_goal_roadmap', { topics: [] });

    expect(outcome.isError).toBe(true);
    expect(outcome.text).toMatch(/^VALIDATION: Provide exactly one of goalId or newGoal/);
  });

  it('reports roadmap problems as validation errors', async () => {
    await client.callOk('start_session');

    const outcome = await client.call('save_goal_roadmap', {
      newGoal: NEW_GOAL,
      topics: [{ key: 'css.grid', parentKey: 'css', title: 'CSS grid', tier: 'core', position: 0 }],
    });

    expect(outcome.isError).toBe(true);
    expect(outcome.text).toContain('Unknown parent topic');
  });

  it('rejects input that breaks the schema', async () => {
    await client.callOk('start_session');

    const longTitle = await client.call('save_goal_roadmap', {
      newGoal: { ...NEW_GOAL, title: 'x'.repeat(201) },
      topics: [],
    });
    const unsafeSource = await client.call('save_goal_roadmap', {
      newGoal: NEW_GOAL,
      topics: [
        { key: 'css', title: 'CSS', tier: 'core', position: 0, sources: ['javascript:alert(1)'] },
      ],
    });

    expect(longTitle.isError).toBe(true);
    expect(unsafeSource.isError).toBe(true);
  });

  it('saves preferences and requires at least one value', async () => {
    await client.callOk('start_session');

    expect(await client.callOk('update_preferences', { language: 'roman-urdu' })).toEqual({
      learner: { githubLogin: 'sara', language: 'roman-urdu', hintLimit: 3, sessionMinutes: 40 },
    });

    const empty = await client.call('update_preferences', {});
    const outOfRange = await client.call('update_preferences', { hintLimit: 50 });

    expect(empty.isError).toBe(true);
    expect(empty.text).toMatch(/^VALIDATION:/);
    expect(outOfRange.isError).toBe(true);
  });

  it('hides the details of unexpected server errors', async () => {
    const failingDb = {
      prepare() {
        throw new Error('D1_ERROR: no such table: learners (SELECT * FROM learners)');
      },
    } as unknown as D1Database;
    const broken = await connectAs(SARA, clock, failingDb);

    const outcome = await broken.call('start_session');
    await broken.close();

    expect(outcome.isError).toBe(true);
    expect(outcome.text).toMatch(/^INTERNAL:/);
    expect(outcome.text).not.toContain('SELECT');
  });
});
