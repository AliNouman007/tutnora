import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { recordEvidence } from '../../src/services/evidence';
import type { RecordEvidenceInput } from '../../src/services/evidence';
import { endSession } from '../../src/services/handoff';
import { updatePreferences } from '../../src/services/preferences';
import { getProgress } from '../../src/services/progress';
import { saveGoalRoadmap } from '../../src/services/roadmap';
import { startSession } from '../../src/services/session';
import { NOW, minutesLater, topicInput } from '../helpers/repositories';

// The complete learning flow, without an assistant: what the tutor's tool calls will do.

const SARA = { learnerId: '1001', githubLogin: 'sara' };
const DAY_MINUTES = 24 * 60;

function answer(
  goalId: string,
  topicKey: string,
  overrides: Partial<RecordEvidenceInput> = {},
): RecordEvidenceInput {
  return {
    goalId,
    topicKey,
    kind: 'interview_answer',
    support: 'independent',
    result: 'pass',
    note: null,
    requestId: null,
    ...overrides,
  };
}

/** Day one: onboarding, a roadmap, a lesson with two checks, and a handoff. Returns the goal id. */
async function runDayOne(): Promise<string> {
  const first = await startSession(env.DB, SARA, null, NOW);
  expect(first.isNewLearner).toBe(true);
  expect(first.focusGoal).toBeNull();

  await updatePreferences(env.DB, SARA.learnerId, { language: 'roman-urdu' }, minutesLater(1));

  const { goal } = await saveGoalRoadmap(
    env.DB,
    SARA.learnerId,
    {
      newGoal: {
        title: 'Frontend interview preparation',
        purpose: 'interview',
        targetLevel: 'mid-level',
        mode: 'topic',
      },
      topics: [
        topicInput('css', { title: 'CSS', position: 0 }),
        topicInput('css.layout.position', {
          parentKey: 'css',
          title: 'CSS positioning',
          position: 1,
        }),
        topicInput('css.layout.flexbox', { parentKey: 'css', title: 'Flexbox', position: 2 }),
        topicInput('css.animations', {
          parentKey: 'css',
          title: 'CSS animations',
          tier: 'awareness',
          position: 3,
        }),
      ],
    },
    minutesLater(2),
  );

  // The lesson: Sara explains the position values correctly, then mixes up sticky and fixed.
  const explained = await recordEvidence(
    env.DB,
    SARA.learnerId,
    answer(goal.id, 'css.layout.position', { kind: 'explain' }),
    minutesLater(10),
  );
  expect(explained.progress.status).toBe('demonstrated');

  const followUp = await recordEvidence(
    env.DB,
    SARA.learnerId,
    answer(goal.id, 'css.layout.position', { result: 'fail', note: 'Mixed up sticky and fixed.' }),
    minutesLater(20),
  );
  expect(followUp.progress.status).toBe('needs_revision');

  await endSession(
    env.DB,
    SARA.learnerId,
    {
      goalId: goal.id,
      summary: 'Learned CSS positioning; sticky versus fixed is still unclear.',
      nextStep: 'Revise sticky versus fixed, then start flexbox.',
      openQuestions: null,
    },
    minutesLater(30),
  );

  return goal.id;
}

describe('learning flow', () => {
  it('runs a first session from onboarding to handoff', async () => {
    const goalId = await runDayOne();

    const progress = await getProgress(env.DB, SARA.learnerId, goalId, minutesLater(31));

    expect(progress.statusCounts).toEqual({
      not_started: 3,
      learning: 0,
      practised: 0,
      demonstrated: 0,
      needs_revision: 1,
    });
    expect(progress.dueCount).toBe(0);
  });

  it('resumes the next day with the handoff, a warm-up, and updated progress', async () => {
    const goalId = await runDayOne();
    const nextDay = minutesLater(DAY_MINUTES + 60);

    const session = await startSession(env.DB, SARA, null, nextDay);

    expect(session.isNewLearner).toBe(false);
    expect(session.learner.language).toBe('roman-urdu');
    expect(session.focusGoal?.id).toBe(goalId);
    expect(session.lastHandoff?.nextStep).toBe('Revise sticky versus fixed, then start flexbox.');
    expect(session.warmUp.map((topic) => [topic.key, topic.status])).toEqual([
      ['css.layout.position', 'needs_revision'],
    ]);

    // Sara answers the warm-up correctly. The tutor retries the same call; it is not counted twice.
    const warmUpAnswer = answer(goalId, 'css.layout.position', {
      kind: 'recall',
      requestId: 'day-2-warm-up-1',
    });
    const revised = await recordEvidence(env.DB, SARA.learnerId, warmUpAnswer, nextDay);
    const retried = await recordEvidence(env.DB, SARA.learnerId, warmUpAnswer, nextDay);

    expect(revised.progress).toEqual({
      status: 'demonstrated',
      nextReviewAt: minutesLater(4 * DAY_MINUTES + 60),
      independentStreak: 1,
    });
    expect(retried.duplicate).toBe(true);

    const progress = await getProgress(env.DB, SARA.learnerId, goalId, nextDay);
    expect(progress.statusCounts).toMatchObject({
      demonstrated: 1,
      needs_revision: 0,
      not_started: 3,
    });
    expect(progress.dueCount).toBe(0);
  });

  it('keeps the first goal unchanged and resumable when a second goal is started', async () => {
    const frontendId = await runDayOne();
    const nextDay = minutesLater(DAY_MINUTES + 60);
    const before = await getProgress(env.DB, SARA.learnerId, frontendId, nextDay);

    const { goal: aiEngineering } = await saveGoalRoadmap(
      env.DB,
      SARA.learnerId,
      {
        newGoal: { title: 'AI engineering', purpose: 'skill', targetLevel: null, mode: 'mixed' },
        topics: [topicInput('llm', { title: 'Large language models' })],
      },
      nextDay,
    );

    expect(await getProgress(env.DB, SARA.learnerId, frontendId, nextDay)).toEqual(before);

    const session = await startSession(env.DB, SARA, null, minutesLater(DAY_MINUTES + 90));
    expect(session.goals.map((goal) => goal.id)).toEqual([frontendId, aiEngineering.id]);
    expect(session.focusGoal?.id).toBe(frontendId);
  });
});
