import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import {
  findEvidenceByRequestId,
  insertEvidence,
  listEvidenceForGoal,
  listEvidenceForTopic,
} from '../../../src/db/evidence';
import { deriveTopicProgress } from '../../../src/domain/progress';
import { NOW, evidenceFor, minutesLater, seedGoal, seedTopic } from '../../helpers/repositories';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('evidence repository', () => {
  it("records evidence and lists a topic's evidence oldest first", async () => {
    const goal = await seedGoal('1001');
    const topic = await seedTopic('1001', goal);

    const later = await insertEvidence(env.DB, '1001', evidenceFor(topic), minutesLater(10));
    const earlier = await insertEvidence(
      env.DB,
      '1001',
      evidenceFor(topic, { result: 'fail', note: 'Mixed up sticky and fixed.' }),
      NOW,
    );

    expect(await listEvidenceForTopic(env.DB, '1001', topic.id)).toEqual([earlier, later]);
  });

  it('stores evidence that the progress rules can use directly', async () => {
    const goal = await seedGoal('1001');
    const topic = await seedTopic('1001', goal);
    await insertEvidence(env.DB, '1001', evidenceFor(topic), NOW);

    const progress = deriveTopicProgress(await listEvidenceForTopic(env.DB, '1001', topic.id));

    expect(progress.status).toBe('demonstrated');
    expect(progress.nextReviewAt).toEqual(new Date(NOW.getTime() + 3 * DAY_MS));
  });

  it('finds evidence by request id', async () => {
    const goal = await seedGoal('1001');
    const topic = await seedTopic('1001', goal);
    const saved = await insertEvidence(
      env.DB,
      '1001',
      evidenceFor(topic, { requestId: 'req-1' }),
      NOW,
    );

    expect(await findEvidenceByRequestId(env.DB, '1001', 'req-1')).toEqual(saved);
    expect(await findEvidenceByRequestId(env.DB, '1001', 'req-unknown')).toBeNull();
  });

  it("lists all evidence for a goal's topics", async () => {
    const goal = await seedGoal('1001');
    const position = await seedTopic('1001', goal, 'css.layout.position');
    const grid = await seedTopic('1001', goal, 'css.layout.grid');
    await insertEvidence(env.DB, '1001', evidenceFor(position), NOW);
    await insertEvidence(env.DB, '1001', evidenceFor(grid), minutesLater(1));

    const evidence = await listEvidenceForGoal(env.DB, '1001', goal.id);

    expect(evidence.map((entry) => entry.topicId)).toEqual([position.id, grid.id]);
  });
});
