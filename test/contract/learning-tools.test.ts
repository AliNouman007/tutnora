import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectAs } from '../helpers/mcp-client';
import type { TestClient } from '../helpers/mcp-client';
import { NOW, minutesLater } from '../helpers/repositories';

const SARA = { learnerId: '1001', githubLogin: 'sara' };
const DAY_MINUTES = 24 * 60;

describe('learning tools', () => {
  let now: Date;
  let client: TestClient;
  let goalId: string;

  beforeEach(async () => {
    now = NOW;
    client = await connectAs(SARA, () => now);
    await client.callOk('start_session');
    const saved = (await client.callOk('save_goal_roadmap', {
      newGoal: { title: 'Frontend interview preparation', purpose: 'interview', mode: 'topic' },
      topics: [
        { key: 'css', title: 'CSS', tier: 'core', position: 0 },
        {
          key: 'css.layout.position',
          parentKey: 'css',
          title: 'CSS positioning',
          tier: 'core',
          position: 1,
        },
      ],
    })) as { goal: { id: string } };
    goalId = saved.goal.id;
  });

  afterEach(async () => {
    await client.close();
  });

  function answer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      goalId,
      topicKey: 'css.layout.position',
      kind: 'interview_answer',
      support: 'independent',
      result: 'pass',
      ...overrides,
    };
  }

  it('lists the learning tools', async () => {
    expect(await client.listTools()).toEqual(
      expect.arrayContaining(['record_evidence', 'end_session', 'get_progress']),
    );
  });

  it('records evidence and returns the progress Tutnora calculated', async () => {
    const result = await client.callOk(
      'record_evidence',
      answer({ note: 'Explained all five position values.' }),
    );

    expect(result).toEqual({
      topicKey: 'css.layout.position',
      status: 'demonstrated',
      nextReviewAt: minutesLater(3 * DAY_MINUTES).toISOString(),
      independentStreak: 1,
      duplicate: false,
    });
  });

  it('does not count a retried answer twice', async () => {
    const first = await client.callOk('record_evidence', answer({ requestId: 'req-1' }));
    const retry = await client.callOk('record_evidence', answer({ requestId: 'req-1' }));

    expect(first).toMatchObject({ duplicate: false });
    expect(retry).toMatchObject({ duplicate: true, status: 'demonstrated' });
  });

  it('reports a topic that is not in the goal', async () => {
    const outcome = await client.call('record_evidence', answer({ topicKey: 'css.missing' }));

    expect(outcome.isError).toBe(true);
    expect(outcome.text).toMatch(/^NOT_FOUND:/);
  });

  it('rejects evidence that breaks the schema', async () => {
    const unknownSupport = await client.call('record_evidence', answer({ support: 'cheated' }));
    const longNote = await client.call('record_evidence', answer({ note: 'x'.repeat(501) }));

    expect(unknownSupport.isError).toBe(true);
    expect(longNote.isError).toBe(true);
  });

  it('ends a session with a handoff that the next session resumes from', async () => {
    const ended = await client.callOk('end_session', {
      goalId,
      summary: 'Learned CSS positioning.',
      nextStep: 'Revise sticky, then start flexbox.',
    });

    now = minutesLater(60);
    const nextSession = await client.callOk('start_session');

    expect(ended).toMatchObject({
      handoff: { nextStep: 'Revise sticky, then start flexbox.', openQuestions: null },
    });
    expect(nextSession).toMatchObject({
      focusGoal: { id: goalId },
      lastHandoff: { summary: 'Learned CSS positioning.' },
    });
  });

  it('rejects a handoff summary that is too long', async () => {
    const outcome = await client.call('end_session', {
      goalId,
      summary: 'x'.repeat(1001),
      nextStep: 'Next.',
    });

    expect(outcome.isError).toBe(true);
  });

  it("shows the goal's progress and what is due", async () => {
    await client.callOk('record_evidence', answer({ result: 'fail' }));

    now = minutesLater(DAY_MINUTES + 1);
    const progress = await client.callOk('get_progress', { goalId });

    expect(progress).toMatchObject({
      goal: { id: goalId },
      statusCounts: {
        not_started: 1,
        learning: 1,
        practised: 0,
        demonstrated: 0,
        needs_revision: 0,
      },
      dueCount: 1,
      topics: [
        { key: 'css', status: 'not_started', due: false, nextReviewAt: null },
        { key: 'css.layout.position', status: 'learning', due: true },
      ],
    });
  });
});
