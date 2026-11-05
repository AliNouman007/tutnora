import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { getLearner, updateLearnerPreferences, upsertLearner } from '../../../src/db/learners';
import { NOW, minutesLater } from '../../helpers/repositories';

describe('learners repository', () => {
  it('creates a learner with default preferences on first sign-in', async () => {
    const learner = await upsertLearner(env.DB, '1001', 'sara', NOW);

    expect(learner).toEqual({
      id: '1001',
      githubLogin: 'sara',
      language: null,
      hintLimit: 3,
      sessionMinutes: 40,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(await getLearner(env.DB, '1001')).toEqual(learner);
  });

  it('refreshes the GitHub login on a later sign-in and keeps the creation time', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    const learner = await upsertLearner(env.DB, '1001', 'sara-dev', minutesLater(5));

    expect(learner.githubLogin).toBe('sara-dev');
    expect(learner.createdAt).toEqual(NOW);
    expect(learner.updatedAt).toEqual(minutesLater(5));
  });

  it('updates only the preferences that are given', async () => {
    await upsertLearner(env.DB, '1001', 'sara', NOW);

    const learner = await updateLearnerPreferences(
      env.DB,
      '1001',
      { language: 'roman-urdu' },
      minutesLater(1),
    );

    expect(learner).toMatchObject({ language: 'roman-urdu', hintLimit: 3, sessionMinutes: 40 });
  });

  it('returns null when the learner does not exist', async () => {
    expect(await getLearner(env.DB, 'missing')).toBeNull();
    expect(await updateLearnerPreferences(env.DB, 'missing', { hintLimit: 2 }, NOW)).toBeNull();
  });
});
