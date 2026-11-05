import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { getTopicByKey, listTopics, upsertTopics } from '../../../src/db/topics';
import { NOW, minutesLater, seedGoal, topicInput } from '../../helpers/repositories';

const MDN_POSITION = 'https://developer.mozilla.org/en-US/docs/Web/CSS/position';

describe('topics repository', () => {
  it('saves topics and lists them in roadmap order', async () => {
    const goal = await seedGoal('1001');

    await upsertTopics(
      env.DB,
      '1001',
      goal.id,
      [
        topicInput('css.layout.grid', { position: 2 }),
        topicInput('css.layout.position', { position: 1, sources: [MDN_POSITION] }),
      ],
      NOW,
    );

    const topics = await listTopics(env.DB, '1001', goal.id);
    expect(topics.map((topic) => topic.key)).toEqual(['css.layout.position', 'css.layout.grid']);
    expect(topics[0]?.sources).toEqual([MDN_POSITION]);
  });

  it('updates topics by key, keeps their id, and never removes topics left out', async () => {
    const goal = await seedGoal('1001');
    await upsertTopics(
      env.DB,
      '1001',
      goal.id,
      [topicInput('css.layout.position'), topicInput('css.layout.grid')],
      NOW,
    );
    const original = await getTopicByKey(env.DB, '1001', goal.id, 'css.layout.position');

    await upsertTopics(
      env.DB,
      '1001',
      goal.id,
      [topicInput('css.layout.position', { title: 'CSS positioning', tier: 'working' })],
      minutesLater(30),
    );

    const updated = await getTopicByKey(env.DB, '1001', goal.id, 'css.layout.position');
    expect(updated).toMatchObject({
      id: original?.id,
      title: 'CSS positioning',
      tier: 'working',
      createdAt: NOW,
      updatedAt: minutesLater(30),
    });
    expect(await listTopics(env.DB, '1001', goal.id)).toHaveLength(2);
  });

  it('returns null for a topic key that does not exist', async () => {
    const goal = await seedGoal('1001');

    expect(await getTopicByKey(env.DB, '1001', goal.id, 'css.missing')).toBeNull();
  });
});
