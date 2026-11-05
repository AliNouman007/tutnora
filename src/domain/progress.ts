import type { EvidenceResult, EvidenceSupport, TopicStatus } from './types';

/** The fields of an evidence record that progress depends on. */
export interface ProgressEvidence {
  readonly id: string;
  readonly support: EvidenceSupport;
  readonly result: EvidenceResult;
  readonly createdAt: Date;
}

/** A topic's progress, derived from its evidence (ADR 0003). Never stored. */
export interface TopicProgress {
  readonly status: TopicStatus;
  /** When the topic is next due for review, or null when it has no evidence. */
  readonly nextReviewAt: Date | null;
  /** Consecutive independent passes since the last reset. */
  readonly independentStreak: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days until review after a pass with hints or AI assistance. */
export const ASSISTED_PASS_INTERVAL_DAYS = 2;

/** Days until review after a shown solution, a partial result, or a failure. */
export const RETRY_INTERVAL_DAYS = 1;

/**
 * Days until review after an independent pass, by the number of consecutive
 * independent passes: 3, 7, 21, then 60 days.
 */
export function independentPassIntervalDays(streak: number): number {
  if (streak <= 1) {
    return 3;
  }
  if (streak === 2) {
    return 7;
  }
  if (streak === 3) {
    return 21;
  }
  return 60;
}

/**
 * Derives a topic's status, next review time, and independent streak from its evidence.
 * Evidence is processed oldest first; entries recorded at the same time are ordered by id.
 * A "day" is exactly 24 hours.
 */
export function deriveTopicProgress(evidence: readonly ProgressEvidence[]): TopicProgress {
  let status: TopicStatus = 'not_started';
  let nextReviewAt: Date | null = null;
  let independentStreak = 0;
  let hasPreviousSuccess = false;

  for (const entry of [...evidence].sort(compareEvidence)) {
    let intervalDays: number;

    if (entry.result !== 'pass') {
      status = hasPreviousSuccess ? 'needs_revision' : 'learning';
      independentStreak = 0;
      intervalDays = RETRY_INTERVAL_DAYS;
    } else if (entry.support === 'independent') {
      independentStreak += 1;
      status = 'demonstrated';
      intervalDays = independentPassIntervalDays(independentStreak);
      hasPreviousSuccess = true;
    } else if (entry.support === 'solution_shown') {
      status = 'learning';
      independentStreak = 0;
      intervalDays = RETRY_INTERVAL_DAYS;
    } else {
      // 'hinted' or 'ai_assisted': counts as practice; the streak is unchanged.
      status = 'practised';
      intervalDays = ASSISTED_PASS_INTERVAL_DAYS;
      hasPreviousSuccess = true;
    }

    nextReviewAt = new Date(entry.createdAt.getTime() + intervalDays * DAY_MS);
  }

  return { status, nextReviewAt, independentStreak };
}

/** Whether a topic is due for review at the given time. Topics without evidence are never due. */
export function isDue(progress: TopicProgress, now: Date): boolean {
  return progress.nextReviewAt !== null && progress.nextReviewAt.getTime() <= now.getTime();
}

function compareEvidence(a: ProgressEvidence, b: ProgressEvidence): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  return byTime !== 0 ? byTime : a.id.localeCompare(b.id, 'en');
}
