import { isDue } from './progress';
import type { TopicProgress } from './progress';
import type { TopicTier } from './types';

/** Maximum number of topics in a session warm-up (ADR 0003). */
export const WARM_UP_LIMIT = 3;

/** A topic considered for the warm-up, with its derived progress. */
export interface WarmUpCandidate {
  readonly topicKey: string;
  readonly tier: TopicTier;
  readonly progress: TopicProgress;
}

type DueCandidate = WarmUpCandidate & {
  readonly progress: TopicProgress & { readonly nextReviewAt: Date };
};

const TIER_ORDER: Readonly<Record<TopicTier, number>> = { core: 0, working: 1, awareness: 2 };

/**
 * Selects up to three due topics for a session warm-up, ordered by:
 * needs_revision first, then tier (core, working, awareness), then most overdue,
 * then topic key so the result is deterministic.
 */
export function selectWarmUpTopics(
  candidates: readonly WarmUpCandidate[],
  now: Date,
): WarmUpCandidate[] {
  return candidates
    .filter((candidate): candidate is DueCandidate => isDue(candidate.progress, now))
    .sort(compareWarmUp)
    .slice(0, WARM_UP_LIMIT);
}

function compareWarmUp(a: DueCandidate, b: DueCandidate): number {
  const byRevision = revisionRank(a) - revisionRank(b);
  if (byRevision !== 0) {
    return byRevision;
  }
  const byTier = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (byTier !== 0) {
    return byTier;
  }
  const byOverdue = a.progress.nextReviewAt.getTime() - b.progress.nextReviewAt.getTime();
  if (byOverdue !== 0) {
    return byOverdue;
  }
  return a.topicKey.localeCompare(b.topicKey, 'en');
}

function revisionRank(candidate: WarmUpCandidate): number {
  return candidate.progress.status === 'needs_revision' ? 0 : 1;
}
