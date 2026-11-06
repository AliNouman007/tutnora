import { AppError } from './errors';
import { isValidTopicKey } from './limits';

/** The parts of a roadmap topic that define its place in the topic tree. */
export interface RoadmapNode {
  readonly key: string;
  readonly parentKey: string | null;
}

/**
 * Checks topics about to be saved into a goal's roadmap, together with the topics it already has.
 * Keys must be valid and unique within the save, every parent must exist in the roadmap, and the
 * tree must not contain cycles. Throws AppError('VALIDATION') describing the first problem found.
 */
export function validateRoadmapTopics(
  existing: readonly RoadmapNode[],
  incoming: readonly RoadmapNode[],
): void {
  const incomingKeys = new Set<string>();
  for (const topic of incoming) {
    if (!isValidTopicKey(topic.key)) {
      throw new AppError('VALIDATION', `Invalid topic key: "${topic.key}".`);
    }
    if (incomingKeys.has(topic.key)) {
      throw new AppError('VALIDATION', `Duplicate topic key: "${topic.key}".`);
    }
    incomingKeys.add(topic.key);
  }

  // The roadmap after this save: incoming topics replace existing topics with the same key.
  const parents = new Map<string, string | null>();
  for (const topic of [...existing, ...incoming]) {
    parents.set(topic.key, topic.parentKey);
  }

  for (const topic of incoming) {
    if (topic.parentKey !== null && !parents.has(topic.parentKey)) {
      throw new AppError(
        'VALIDATION',
        `Unknown parent topic "${topic.parentKey}" for "${topic.key}".`,
      );
    }
  }

  for (const topic of incoming) {
    const visited = new Set<string>();
    let current: string | null | undefined = topic.key;
    while (typeof current === 'string') {
      if (visited.has(current)) {
        throw new AppError('VALIDATION', `Topic "${topic.key}" is part of a parent cycle.`);
      }
      visited.add(current);
      current = parents.get(current);
    }
  }
}
