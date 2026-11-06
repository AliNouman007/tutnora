import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { upsertLearner } from '../../../src/db/learners';
import { updatePreferences } from '../../../src/services/preferences';
import { expectAppError } from '../../helpers/errors';
import { NOW, minutesLater } from '../../helpers/repositories';

describe('updatePreferences', () => {
  it('saves the given preferences and keeps the others', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    const learner = await updatePreferences(
      env.DB,
      '1001',
      { language: 'roman-urdu', hintLimit: 2 },
      minutesLater(1),
    );

    expect(learner).toMatchObject({ language: 'roman-urdu', hintLimit: 2, sessionMinutes: 40 });
  });

  it('rejects a learner without a profile', async () => {
    await expectAppError(
      updatePreferences(env.DB, 'unknown-learner', { language: 'english' }, NOW),
      'NOT_FOUND',
    );
  });
});
