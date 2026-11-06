import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { listEvidenceForTopic } from '../../src/db/evidence';
import type { Goal, Topic } from '../../src/domain/entities';
import { recordEvidence } from '../../src/services/evidence';
import type { RecordEvidenceInput } from '../../src/services/evidence';
import { endSession } from '../../src/services/handoff';
import { getProgress } from '../../src/services/progress';
import { expectAppError } from '../helpers/errors';
import { NOW, seedGoal, seedTopic } from '../helpers/repositories';

const A = 'learner-a';
const B = 'learner-b';

function evidenceInput(goal: Goal, topic: Topic, requestId: string | null): RecordEvidenceInput {
  return {
    goalId: goal.id,
    topicKey: topic.key,
    kind: 'recall',
    support: 'independent',
    result: 'pass',
    note: null,
    requestId,
  };
}

async function seedBoth() {
  const goalA = await seedGoal(A);
  const topicA = await seedTopic(A, goalA);
  const goalB = await seedGoal(B);
  const topicB = await seedTopic(B, goalB);
  return { goalA, topicA, goalB, topicB };
}

describe('learning-flow isolation between learners', () => {
  it("cannot record evidence on another learner's goal", async () => {
    const { goalA, topicA } = await seedBoth();

    await expectAppError(
      recordEvidence(env.DB, B, evidenceInput(goalA, topicA, null), NOW),
      'NOT_FOUND',
    );
    expect(await listEvidenceForTopic(env.DB, A, topicA.id)).toEqual([]);
  });

  it("cannot end a session or read progress for another learner's goal", async () => {
    const { goalA } = await seedBoth();

    await expectAppError(
      endSession(
        env.DB,
        B,
        { goalId: goalA.id, summary: 'Not mine.', nextStep: 'None.', openQuestions: null },
        NOW,
      ),
      'NOT_FOUND',
    );
    await expectAppError(getProgress(env.DB, B, goalA.id, NOW), 'NOT_FOUND');
  });

  it('keeps request ids separate between learners', async () => {
    const { goalA, topicA, goalB, topicB } = await seedBoth();
    await recordEvidence(env.DB, A, evidenceInput(goalA, topicA, 'req-1'), NOW);

    const resultB = await recordEvidence(env.DB, B, evidenceInput(goalB, topicB, 'req-1'), NOW);

    expect(resultB.duplicate).toBe(false);
    expect(resultB.evidence.learnerId).toBe(B);
  });
});
