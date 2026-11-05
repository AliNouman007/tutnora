import { describe, expect, it } from 'vitest';
import { TEXT_LIMITS, isValidTopicKey } from '../../../src/domain/limits';

describe('TEXT_LIMITS', () => {
  it('matches the limits documented in docs/ARCHITECTURE.md', () => {
    expect(TEXT_LIMITS.evidenceNote).toBe(500);
    expect(TEXT_LIMITS.handoffSummary).toBe(1000);
    expect(TEXT_LIMITS.handoffNextStep).toBe(500);
    expect(TEXT_LIMITS.handoffOpenQuestions).toBe(500);
  });
});

describe('isValidTopicKey', () => {
  it.each(['css', 'css.layout.position', 'react.hooks.use-effect', 'js.es2024'])(
    'accepts %s',
    (key) => {
      expect(isValidTopicKey(key)).toBe(true);
    },
  );

  it.each([
    '',
    'CSS.layout',
    'css..layout',
    '.css',
    'css.',
    'css layout',
    'css_layout',
    'css.-layout',
    'css--layout',
  ])('rejects "%s"', (key) => {
    expect(isValidTopicKey(key)).toBe(false);
  });

  it('rejects keys longer than the limit', () => {
    expect(isValidTopicKey('a'.repeat(TEXT_LIMITS.topicKey))).toBe(true);
    expect(isValidTopicKey('a'.repeat(TEXT_LIMITS.topicKey + 1))).toBe(false);
  });
});
