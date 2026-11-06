import { describe, expect, it } from 'vitest';
import { clearCookie, readCookie, serializeCookie } from '../../../src/auth/cookies';

describe('sign-in cookies', () => {
  it('writes an http-only, same-site, secure cookie on HTTPS', () => {
    expect(
      serializeCookie('tutnora_state', 'abc', {
        path: '/callback',
        maxAgeSeconds: 600,
        secure: true,
      }),
    ).toBe('tutnora_state=abc; Path=/callback; Max-Age=600; HttpOnly; SameSite=Lax; Secure');
  });

  it('leaves out Secure for local plain HTTP', () => {
    const cookie = serializeCookie('tutnora_state', 'abc', {
      path: '/callback',
      maxAgeSeconds: 600,
      secure: false,
    });

    expect(cookie).toContain('HttpOnly');
    expect(cookie).not.toContain('Secure');
  });

  it('reads one cookie from a header with several', () => {
    expect(readCookie('a=1; tutnora_state=abc; b=2', 'tutnora_state')).toBe('abc');
    expect(readCookie('a=1', 'tutnora_state')).toBeNull();
    expect(readCookie(null, 'tutnora_state')).toBeNull();
  });

  it('clears a cookie by expiring it immediately', () => {
    const cookie = clearCookie('tutnora_state', '/callback', false);

    expect(cookie).toContain('tutnora_state=;');
    expect(cookie).toContain('Max-Age=0');
  });
});
