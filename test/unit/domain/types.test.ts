import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_KINDS,
  EVIDENCE_RESULTS,
  EVIDENCE_SUPPORTS,
  GOAL_MODES,
  GOAL_PURPOSES,
  GOAL_STATUSES,
  TOPIC_STATUSES,
  TOPIC_TIERS,
} from '../../../src/domain/types';

// These values are stored in the database and documented in docs/ARCHITECTURE.md section 4.
// Changing one requires a migration and an ADR, so a failure here must be deliberate.
describe('stored value lists', () => {
  it('lists topic tiers', () => {
    expect(TOPIC_TIERS).toEqual(['core', 'working', 'awareness']);
  });

  it('lists evidence kinds', () => {
    expect(EVIDENCE_KINDS).toEqual([
      'explain',
      'predict_output',
      'debug',
      'build',
      'interview_answer',
      'recall',
    ]);
  });

  it('lists evidence support levels', () => {
    expect(EVIDENCE_SUPPORTS).toEqual(['independent', 'hinted', 'ai_assisted', 'solution_shown']);
  });

  it('lists evidence results', () => {
    expect(EVIDENCE_RESULTS).toEqual(['pass', 'partial', 'fail']);
  });

  it('lists topic statuses', () => {
    expect(TOPIC_STATUSES).toEqual([
      'not_started',
      'learning',
      'practised',
      'demonstrated',
      'needs_revision',
    ]);
  });

  it('lists goal purposes', () => {
    expect(GOAL_PURPOSES).toEqual(['interview', 'project', 'revision', 'skill', 'other']);
  });

  it('lists goal modes', () => {
    expect(GOAL_MODES).toEqual(['topic', 'project', 'mixed']);
  });

  it('lists goal statuses', () => {
    expect(GOAL_STATUSES).toEqual(['active', 'paused', 'done']);
  });
});
