import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { listEvidenceForTopic } from '../../../src/db/evidence';
import type { Goal, Topic } from '../../../src/domain/entities';
import { recordEvidence } from '../../../src/services/evidence';
import type { RecordEvidenceInput } from '../../../src/services/evidence';
import { expectAppError } from '../../helpers/errors';
import { NOW, minutesLater, seedGoal, seedTopic } from '../../helpers/repositories';

const DAY_MINUTES = 24 * 60;

function input(
  goal: Goal,
  topic: Topic,
  overrides: Partial<RecordEvidenceInput> = {},
): RecordEvidenceInput {
  return {
    goalId: goal.id,
    topicKey: topic.key,
    kind: 'interview_answer',
    support: 'independent',
    result: 'pass',
    note: null,
    requestId: null,
    ...overrides,
  };
}

async function seedSara(): Promise<{ goal: Goal; topic: Topic }> {
  const goal = await seedGoal('1001');
  const topic = await seedTopic('1001', goal, 'css.layout.position');
  return { goal, topic };
}

describe('recordEvidence', () => {
  it('records evidence and returns the new status and next review', async () => {
    const { goal, topic } = await seedSara();

    const result = await recordEvidence(
      env.DB,
      '1001',
      input(goal, topic, { note: 'Explained all five position values.' }),
      NOW,
    );

    expect(result.duplicate).toBe(false);
    expect(result.topicKey).toBe('css.layout.position');
    expect(result.evidence.note).toBe('Explained all five position values.');
    expect(result.progress).toEqual({
      status: 'demonstrated',
      nextReviewAt: minutesLater(3 * DAY_MINUTES),
      independentStreak: 1,
    });
  });

  it('marks a topic needs_revision when a later answer is wrong', async () => {
    const { goal, topic } = await seedSara();
    await recordEvidence(env.DB, '1001', input(goal, topic), NOW);

    const result = await recordEvidence(
      env.DB,
      '1001',
      input(goal, topic, { result: 'fail', note: 'Mixed up sticky and fixed.' }),
      minutesLater(DAY_MINUTES),
    );

    expect(result.progress).toEqual({
      status: 'needs_revision',
      nextReviewAt: minutesLater(2 * DAY_MINUTES),
      independentStreak: 0,
    });
  });

  it('returns the original result when the same request id is sent again', async () => {
    const { goal, topic } = await seedSara();
    const first = await recordEvidence(
      env.DB,
      '1001',
      input(goal, topic, { requestId: 'req-1' }),
      NOW,
    );

    const retry = await recordEvidence(
      env.DB,
      '1001',
      input(goal, topic, { requestId: 'req-1' }),
      minutesLater(1),
    );

    expect(retry.duplicate).toBe(true);
    expect(retry.evidence).toEqual(first.evidence);
    expect(await listEvidenceForTopic(env.DB, '1001', topic.id)).toHaveLength(1);
  });

  it('rejects a request id that was already used for a different topic', async () => {
    const { goal, topic } = await seedSara();
    const grid = await seedTopic('1001', goal, 'css.layout.grid');
    await recordEvidence(env.DB, '1001', input(goal, topic, { requestId: 'req-1' }), NOW);

    await expectAppError(
      recordEvidence(env.DB, '1001', input(goal, grid, { requestId: 'req-1' }), NOW),
      'CONFLICT',
    );
  });

  it('rejects a goal that does not exist', async () => {
    const { goal, topic } = await seedSara();

    await expectAppError(
      recordEvidence(env.DB, '1001', input(goal, topic, { goalId: 'missing-goal' }), NOW),
      'NOT_FOUND',
    );
  });

  it('rejects a topic that is not in the goal', async () => {
    const { goal, topic } = await seedSara();

    await expectAppError(
      recordEvidence(env.DB, '1001', input(goal, topic, { topicKey: 'css.missing' }), NOW),
      'NOT_FOUND',
    );
  });
});
