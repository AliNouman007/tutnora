import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { savePending, takePending } from '../../../src/auth/pending';

describe('pending sign-in state', () => {
  it('returns a saved value once, then never again', async () => {
    const token = await savePending(env.OAUTH_KV, 'consent', { clientId: 'client-1' });

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await takePending(env.OAUTH_KV, 'consent', token)).toEqual({ clientId: 'client-1' });
    expect(await takePending(env.OAUTH_KV, 'consent', token)).toBeNull();
  });

  it('keeps the consent step and the GitHub step separate', async () => {
    const token = await savePending(env.OAUTH_KV, 'consent', { step: 'consent' });

    expect(await takePending(env.OAUTH_KV, 'github-state', token)).toBeNull();
    expect(await takePending(env.OAUTH_KV, 'consent', token)).toEqual({ step: 'consent' });
  });

  it('rejects malformed tokens without reading storage', async () => {
    expect(await takePending(env.OAUTH_KV, 'consent', '../../secret')).toBeNull();
    expect(await takePending(env.OAUTH_KV, 'consent', '')).toBeNull();
  });

  it('creates a different token every time', async () => {
    const first = await savePending(env.OAUTH_KV, 'consent', {});
    const second = await savePending(env.OAUTH_KV, 'consent', {});

    expect(first).not.toBe(second);
  });
});
