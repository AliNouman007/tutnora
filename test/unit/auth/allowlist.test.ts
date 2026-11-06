import { describe, expect, it } from 'vitest';
import { parseAllowedGithubIds } from '../../../src/auth/allowlist';

describe('parseAllowedGithubIds', () => {
  it('reads comma-separated numeric ids and ignores spaces', () => {
    expect([...parseAllowedGithubIds(' 210321753, 42 ')]).toEqual(['210321753', '42']);
  });

  it('ignores entries that are not GitHub numeric ids', () => {
    expect([...parseAllowedGithubIds('AliNouman007,0,-5,12a,,7')]).toEqual(['7']);
  });

  it('allows nobody when the value is missing or empty', () => {
    expect(parseAllowedGithubIds(undefined).size).toBe(0);
    expect(parseAllowedGithubIds('').size).toBe(0);
  });
});
