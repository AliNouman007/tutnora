import { describe, expect, it } from 'vitest';
import {
  ASSISTED_PASS_INTERVAL_DAYS,
  RETRY_INTERVAL_DAYS,
  deriveTopicProgress,
  independentPassIntervalDays,
  isDue,
} from '../../../src/domain/progress';
import type { ProgressEvidence } from '../../../src/domain/progress';
import type { EvidenceResult, EvidenceSupport } from '../../../src/domain/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date('2026-01-01T00:00:00.000Z');

function day(n: number): Date {
  return new Date(START.getTime() + n * DAY_MS);
}

function evidence(
  id: string,
  createdAt: Date,
  support: EvidenceSupport,
  result: EvidenceResult,
): ProgressEvidence {
  return { id, createdAt, support, result };
}

describe('deriveTopicProgress', () => {
  it('returns not_started with no review date when there is no evidence', () => {
    expect(deriveTopicProgress([])).toEqual({
      status: 'not_started',
      nextReviewAt: null,
      independentStreak: 0,
    });
  });

  it('marks a topic demonstrated after an independent pass and reviews it in 3 days', () => {
    const progress = deriveTopicProgress([evidence('e1', day(0), 'independent', 'pass')]);

    expect(progress).toEqual({
      status: 'demonstrated',
      nextReviewAt: day(3),
      independentStreak: 1,
    });
  });

  it('uses 3, 7, 21, then 60 days for consecutive independent passes', () => {
    const expectedIntervals = [3, 7, 21, 60, 60];
    const history: ProgressEvidence[] = [];

    for (const [index, interval] of expectedIntervals.entries()) {
      history.push(evidence(`e${index}`, day(index * 100), 'independent', 'pass'));

      const progress = deriveTopicProgress(history);

      expect(progress.independentStreak).toBe(index + 1);
      expect(progress.nextReviewAt).toEqual(day(index * 100 + interval));
    }
  });

  it.each(['hinted', 'ai_assisted'] as const)(
    'marks a topic practised after a %s pass and reviews it in 2 days',
    (support) => {
      const progress = deriveTopicProgress([evidence('e1', day(0), support, 'pass')]);

      expect(progress).toEqual({
        status: 'practised',
        nextReviewAt: day(ASSISTED_PASS_INTERVAL_DAYS),
        independentStreak: 0,
      });
    },
  );

  it('keeps the independent streak unchanged after an assisted pass', () => {
    const progress = deriveTopicProgress([
      evidence('e1', day(0), 'independent', 'pass'),
      evidence('e2', day(10), 'hinted', 'pass'),
      evidence('e3', day(20), 'independent', 'pass'),
    ]);

    expect(progress.independentStreak).toBe(2);
    expect(progress.nextReviewAt).toEqual(day(27));
  });

  it('marks a topic learning and resets the streak after a shown solution', () => {
    const progress = deriveTopicProgress([
      evidence('e1', day(0), 'independent', 'pass'),
      evidence('e2', day(10), 'independent', 'pass'),
      evidence('e3', day(20), 'solution_shown', 'pass'),
    ]);

    expect(progress).toEqual({
      status: 'learning',
      nextReviewAt: day(20 + RETRY_INTERVAL_DAYS),
      independentStreak: 0,
    });
  });

  it('restarts the interval sequence after a reset', () => {
    const progress = deriveTopicProgress([
      evidence('e1', day(0), 'independent', 'pass'),
      evidence('e2', day(10), 'independent', 'pass'),
      evidence('e3', day(20), 'solution_shown', 'pass'),
      evidence('e4', day(30), 'independent', 'pass'),
    ]);

    expect(progress.independentStreak).toBe(1);
    expect(progress.nextReviewAt).toEqual(day(33));
  });

  it.each(['partial', 'fail'] as const)(
    'marks a topic learning after a %s result with no earlier success',
    (result) => {
      const progress = deriveTopicProgress([evidence('e1', day(0), 'independent', result)]);

      expect(progress).toEqual({
        status: 'learning',
        nextReviewAt: day(RETRY_INTERVAL_DAYS),
        independentStreak: 0,
      });
    },
  );

  it.each(['independent', 'hinted', 'ai_assisted'] as const)(
    'marks a topic needs_revision after a failure that follows a %s pass',
    (support) => {
      const progress = deriveTopicProgress([
        evidence('e1', day(0), support, 'pass'),
        evidence('e2', day(5), 'independent', 'fail'),
      ]);

      expect(progress).toEqual({
        status: 'needs_revision',
        nextReviewAt: day(5 + RETRY_INTERVAL_DAYS),
        independentStreak: 0,
      });
    },
  );

  it('marks a topic needs_revision after a partial result that follows a success', () => {
    const progress = deriveTopicProgress([
      evidence('e1', day(0), 'independent', 'pass'),
      evidence('e2', day(5), 'independent', 'partial'),
    ]);

    expect(progress.status).toBe('needs_revision');
  });

  it('does not treat a shown solution as an earlier success', () => {
    const progress = deriveTopicProgress([
      evidence('e1', day(0), 'solution_shown', 'pass'),
      evidence('e2', day(5), 'independent', 'fail'),
    ]);

    expect(progress.status).toBe('learning');
  });

  it('returns to demonstrated after an independent pass that follows a revision', () => {
    const progress = deriveTopicProgress([
      evidence('e1', day(0), 'independent', 'pass'),
      evidence('e2', day(5), 'independent', 'fail'),
      evidence('e3', day(6), 'independent', 'pass'),
    ]);

    expect(progress).toEqual({
      status: 'demonstrated',
      nextReviewAt: day(9),
      independentStreak: 1,
    });
  });

  it('processes evidence in time order regardless of input order', () => {
    const progress = deriveTopicProgress([
      evidence('e2', day(10), 'independent', 'pass'),
      evidence('e1', day(0), 'independent', 'fail'),
    ]);

    expect(progress).toEqual({
      status: 'demonstrated',
      nextReviewAt: day(13),
      independentStreak: 1,
    });
  });

  it('orders evidence recorded at the same time by id', () => {
    const failure = evidence('a', day(0), 'independent', 'fail');
    const success = evidence('b', day(0), 'independent', 'pass');

    expect(deriveTopicProgress([failure, success]).status).toBe('demonstrated');
    expect(deriveTopicProgress([success, failure]).status).toBe('demonstrated');
  });

  it('does not change the order of the input array', () => {
    const input = [
      evidence('e2', day(10), 'independent', 'pass'),
      evidence('e1', day(0), 'independent', 'pass'),
    ];

    deriveTopicProgress(input);

    expect(input.map((entry) => entry.id)).toEqual(['e2', 'e1']);
  });
});

describe('independentPassIntervalDays', () => {
  it.each([
    [1, 3],
    [2, 7],
    [3, 21],
    [4, 60],
    [10, 60],
  ])('reviews after a streak of %i in %i days', (streak, days) => {
    expect(independentPassIntervalDays(streak)).toBe(days);
  });
});

describe('isDue', () => {
  it('never marks a topic without evidence as due', () => {
    expect(isDue(deriveTopicProgress([]), day(1000))).toBe(false);
  });

  it('marks a topic due from its next review time onwards', () => {
    const progress = deriveTopicProgress([evidence('e1', day(0), 'independent', 'pass')]);
    const reviewAt = day(3).getTime();

    expect(isDue(progress, new Date(reviewAt - 1))).toBe(false);
    expect(isDue(progress, new Date(reviewAt))).toBe(true);
    expect(isDue(progress, new Date(reviewAt + 1))).toBe(true);
  });
});
