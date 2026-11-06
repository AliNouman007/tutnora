import { describe, expect, it } from 'vitest';
import { COLLECTION_LIMITS, PREFERENCE_LIMITS } from '../../../src/domain/limits';

describe('tool limits', () => {
  it('limits the size of lists in one tool call', () => {
    expect(COLLECTION_LIMITS).toEqual({ topicsPerSave: 200, sourcesPerTopic: 10 });
  });

  // These ranges must match the CHECK constraints in migrations/0001_initial.sql.
  it('matches the preference ranges enforced by the database', () => {
    expect(PREFERENCE_LIMITS).toEqual({
      hintLimit: { min: 0, max: 10 },
      sessionMinutes: { min: 5, max: 240 },
    });
  });
});
