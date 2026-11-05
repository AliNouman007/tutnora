import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import {
  insertEvidence,
  insertGoal,
  insertHandoff,
  insertLearner,
  insertTopic,
  seedLearner,
} from '../../helpers/db';

const LEARNING_TABLES = ['goals', 'topics', 'evidence', 'handoffs'] as const;
type Table = 'learners' | (typeof LEARNING_TABLES)[number];

async function count(table: Table): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first<{
    total: number;
  }>();
  return row?.total ?? 0;
}

describe('initial schema', () => {
  it('creates the five tables', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('learners', 'goals', 'topics', 'evidence', 'handoffs') ORDER BY name",
    ).all<{ name: string }>();

    expect(results.map((row) => row.name)).toEqual([
      'evidence',
      'goals',
      'handoffs',
      'learners',
      'topics',
    ]);
  });

  it('gives every learning table a learner_id column', async () => {
    for (const table of LEARNING_TABLES) {
      const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{
        name: string;
      }>();

      expect(results.map((column) => column.name)).toContain('learner_id');
    }
  });

  it('rejects values outside the allowed lists', async () => {
    await insertLearner('a');

    await expect(insertGoal('a', 'goal-1', 'banana')).rejects.toThrow(/CHECK constraint failed/);
  });

  it('rejects evidence notes longer than 500 characters', async () => {
    const { goalId, topicId } = await seedLearner('a');

    await insertEvidence({ id: 'e1', learnerId: 'a', goalId, topicId, note: 'x'.repeat(500) });

    await expect(
      insertEvidence({ id: 'e2', learnerId: 'a', goalId, topicId, note: 'x'.repeat(501) }),
    ).rejects.toThrow(/CHECK constraint failed/);
  });
});

describe('cross-learner protection', () => {
  it("rejects a topic that points to another learner's goal", async () => {
    await seedLearner('a');
    await insertLearner('b');

    await expect(insertTopic('b', 'goal-a', 'topic-b')).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it("rejects evidence that points to another learner's topic", async () => {
    const a = await seedLearner('a');
    await seedLearner('b');

    await expect(
      insertEvidence({ id: 'e1', learnerId: 'b', goalId: a.goalId, topicId: a.topicId }),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/);
  });

  it('allows each request id only once per learner', async () => {
    const a = await seedLearner('a');
    const b = await seedLearner('b');

    await insertEvidence({ id: 'e1', learnerId: 'a', ...a, requestId: 'req-1' });
    await expect(
      insertEvidence({ id: 'e2', learnerId: 'a', ...a, requestId: 'req-1' }),
    ).rejects.toThrow(/UNIQUE constraint failed/);

    await insertEvidence({ id: 'e3', learnerId: 'b', ...b, requestId: 'req-1' });
    await insertEvidence({ id: 'e4', learnerId: 'a', ...a });
    await insertEvidence({ id: 'e5', learnerId: 'a', ...a });

    expect(await count('evidence')).toBe(4);
  });

  it("deletes all of a learner's data, and nothing else, when the learner is deleted", async () => {
    for (const learnerId of ['a', 'b']) {
      const { goalId, topicId } = await seedLearner(learnerId);
      await insertEvidence({ id: `evidence-${learnerId}`, learnerId, goalId, topicId });
      await insertHandoff(learnerId, goalId, `handoff-${learnerId}`);
    }

    await env.DB.prepare('DELETE FROM learners WHERE id = ?').bind('a').run();

    expect(await count('learners')).toBe(1);
    for (const table of LEARNING_TABLES) {
      expect(await count(table)).toBe(1);
    }
  });
});

// These two tests run in order (Vitest runs tests in a file sequentially).
describe('test isolation', () => {
  it('can write to the database', async () => {
    await insertLearner('a');

    expect(await count('learners')).toBe(1);
  });

  it('starts the next test with an empty database', async () => {
    expect(await count('learners')).toBe(0);
  });
});
