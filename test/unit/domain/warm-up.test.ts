import { describe, expect, it } from 'vitest';
import { WARM_UP_LIMIT, selectWarmUpTopics } from '../../../src/domain/warm-up';
import type { WarmUpCandidate } from '../../../src/domain/warm-up';
import type { TopicStatus, TopicTier } from '../../../src/domain/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date('2026-01-01T00:00:00.000Z');
const NOW = day(100);

function day(n: number): Date {
  return new Date(START.getTime() + n * DAY_MS);
}

function candidate(
  topicKey: string,
  tier: TopicTier,
  status: TopicStatus,
  nextReviewAt: Date | null,
): WarmUpCandidate {
  return { topicKey, tier, progress: { status, nextReviewAt, independentStreak: 0 } };
}

function keys(selected: readonly WarmUpCandidate[]): string[] {
  return selected.map((entry) => entry.topicKey);
}

describe('selectWarmUpTopics', () => {
  it('returns nothing when no topic is due', () => {
    const candidates = [
      candidate('css.box-model', 'core', 'not_started', null),
      candidate('css.grid', 'core', 'demonstrated', day(101)),
    ];

    expect(selectWarmUpTopics(candidates, NOW)).toEqual([]);
  });

  it('includes only topics that are due', () => {
    const candidates = [
      candidate('css.box-model', 'core', 'not_started', null),
      candidate('css.grid', 'core', 'demonstrated', day(101)),
      candidate('css.flexbox', 'core', 'demonstrated', day(100)),
      candidate('css.position', 'core', 'practised', day(90)),
    ];

    expect(keys(selectWarmUpTopics(candidates, NOW))).toEqual(['css.position', 'css.flexbox']);
  });

  it('returns at most three topics', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e'].map((key) =>
      candidate(`topic.${key}`, 'core', 'demonstrated', day(50)),
    );

    expect(WARM_UP_LIMIT).toBe(3);
    expect(selectWarmUpTopics(candidates, NOW)).toHaveLength(3);
  });

  it('puts needs_revision topics first, before tier and overdue time', () => {
    const candidates = [
      candidate('css.grid', 'core', 'demonstrated', day(10)),
      candidate('css.animations', 'awareness', 'needs_revision', day(99)),
    ];

    expect(keys(selectWarmUpTopics(candidates, NOW))).toEqual(['css.animations', 'css.grid']);
  });

  it('orders by tier when revision status is the same', () => {
    const candidates = [
      candidate('topic.awareness', 'awareness', 'demonstrated', day(50)),
      candidate('topic.working', 'working', 'demonstrated', day(50)),
      candidate('topic.core', 'core', 'demonstrated', day(50)),
    ];

    expect(keys(selectWarmUpTopics(candidates, NOW))).toEqual([
      'topic.core',
      'topic.working',
      'topic.awareness',
    ]);
  });

  it('puts the most overdue topic first when status and tier are the same', () => {
    const candidates = [
      candidate('topic.recent', 'core', 'demonstrated', day(90)),
      candidate('topic.oldest', 'core', 'demonstrated', day(20)),
      candidate('topic.middle', 'core', 'demonstrated', day(60)),
    ];

    expect(keys(selectWarmUpTopics(candidates, NOW))).toEqual([
      'topic.oldest',
      'topic.middle',
      'topic.recent',
    ]);
  });

  it('orders by topic key when everything else is equal', () => {
    const first = candidate('topic.alpha', 'core', 'demonstrated', day(50));
    const second = candidate('topic.beta', 'core', 'demonstrated', day(50));

    expect(keys(selectWarmUpTopics([second, first], NOW))).toEqual(['topic.alpha', 'topic.beta']);
    expect(keys(selectWarmUpTopics([first, second], NOW))).toEqual(['topic.alpha', 'topic.beta']);
  });

  it('does not change the input array', () => {
    const candidates = [
      candidate('topic.b', 'working', 'demonstrated', day(50)),
      candidate('topic.a', 'core', 'needs_revision', day(50)),
    ];

    selectWarmUpTopics(candidates, NOW);

    expect(keys(candidates)).toEqual(['topic.b', 'topic.a']);
  });
});
