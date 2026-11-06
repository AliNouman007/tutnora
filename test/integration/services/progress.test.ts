import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { insertEvidence } from '../../../src/db/evidence';
import { getProgress } from '../../../src/services/progress';
import { expectAppError } from '../../helpers/errors';
import { NOW, evidenceFor, minutesLater, seedGoal, seedTopic } from '../../helpers/repositories';

const DAY_MINUTES = 24 * 60;

describe('getProgress', () => {
  it("summarises a goal's topics, statuses, and due reviews", async () => {
    const goal = await seedGoal('1001');
    const position = await seedTopic('1001', goal, 'css.layout.position');
    const grid = await seedTopic('1001', goal, 'css.layout.grid');
    await seedTopic('1001', goal, 'css.layout.flexbox');
    await insertEvidence(env.DB, '1001', evidenceFor(position, { result: 'fail' }), NOW);
    await insertEvidence(env.DB, '1001', evidenceFor(grid), NOW);

    const progress = await getProgress(env.DB, '1001', goal.id, minutesLater(DAY_MINUTES + 1));

    expect(progress.statusCounts).toEqual({
      not_started: 1,
      learning: 1,
      practised: 0,
      demonstrated: 1,
      needs_revision: 0,
    });
    expect(progress.dueCount).toBe(1);
    expect(progress.topics.map((topic) => [topic.key, topic.status, topic.due])).toEqual([
      ['css.layout.flexbox', 'not_started', false],
      ['css.layout.grid', 'demonstrated', false],
      ['css.layout.position', 'learning', true],
    ]);
  });

  it('reports zero counts for a goal without topics', async () => {
    const goal = await seedGoal('1001');

    const progress = await getProgress(env.DB, '1001', goal.id, NOW);

    expect(progress.topics).toEqual([]);
    expect(progress.dueCount).toBe(0);
    expect(Object.values(progress.statusCounts)).toEqual([0, 0, 0, 0, 0]);
  });

  it('rejects a goal that does not exist', async () => {
    await seedGoal('1001');

    await expectAppError(getProgress(env.DB, '1001', 'missing-goal', NOW), 'NOT_FOUND');
  });
});
