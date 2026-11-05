import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import {
  findEvidenceByRequestId,
  insertEvidence,
  listEvidenceForGoal,
  listEvidenceForTopic,
} from '../../src/db/evidence';
import { getGoal, listGoals } from '../../src/db/goals';
import { getLatestHandoff, insertHandoff } from '../../src/db/handoffs';
import { getLearner, updateLearnerPreferences } from '../../src/db/learners';
import { getTopicByKey, listTopics, upsertTopics } from '../../src/db/topics';
import {
  NOW,
  evidenceFor,
  minutesLater,
  seedGoal,
  seedTopic,
  topicInput,
} from '../helpers/repositories';

const A = 'learner-a';
const B = 'learner-b';

/** Gives learner A a goal, topic, evidence, and handoff, and learner B a goal of their own. */
async function seedTwoLearners() {
  const goalA = await seedGoal(A);
  const topicA = await seedTopic(A, goalA);
  await insertEvidence(env.DB, A, evidenceFor(topicA, { requestId: 'req-a' }), NOW);
  await insertHandoff(
    env.DB,
    A,
    { goalId: goalA.id, summary: 'A studied positioning.', nextStep: 'Grid.', openQuestions: null },
    NOW,
  );
  await seedGoal(B);
  return { goalA, topicA };
}

describe('repository isolation between learners', () => {
  it("cannot read another learner's records", async () => {
    const { goalA, topicA } = await seedTwoLearners();

    expect(await getGoal(env.DB, B, goalA.id)).toBeNull();
    expect((await listGoals(env.DB, B)).map((goal) => goal.learnerId)).toEqual([B]);
    expect(await listTopics(env.DB, B, goalA.id)).toEqual([]);
    expect(await getTopicByKey(env.DB, B, goalA.id, topicA.key)).toBeNull();
    expect(await listEvidenceForTopic(env.DB, B, topicA.id)).toEqual([]);
    expect(await listEvidenceForGoal(env.DB, B, goalA.id)).toEqual([]);
    expect(await findEvidenceByRequestId(env.DB, B, 'req-a')).toBeNull();
    expect(await getLatestHandoff(env.DB, B, goalA.id)).toBeNull();
  });

  it("cannot add records to another learner's goal or topic", async () => {
    const { goalA, topicA } = await seedTwoLearners();

    await expect(
      upsertTopics(env.DB, B, goalA.id, [topicInput('css.new-topic')], NOW),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/);
    await expect(insertEvidence(env.DB, B, evidenceFor(topicA), NOW)).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    );
    await expect(
      insertHandoff(
        env.DB,
        B,
        { goalId: goalA.id, summary: 'Not mine.', nextStep: 'None.', openQuestions: null },
        NOW,
      ),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/);
  });

  it("cannot change another learner's existing topics", async () => {
    const { goalA, topicA } = await seedTwoLearners();

    await upsertTopics(
      env.DB,
      B,
      goalA.id,
      [topicInput(topicA.key, { title: 'Changed by B' })],
      minutesLater(1),
    );

    expect(await getTopicByKey(env.DB, A, goalA.id, topicA.key)).toEqual(topicA);
  });

  it("changes only the learner's own preferences", async () => {
    await seedTwoLearners();

    await updateLearnerPreferences(env.DB, B, { language: 'english' }, minutesLater(1));

    expect((await getLearner(env.DB, A))?.language).toBeNull();
    expect((await getLearner(env.DB, B))?.language).toBe('english');
  });
});
