import { describe, expect, it } from 'vitest';
import {
  GithubAuthError,
  exchangeGithubCode,
  fetchGithubUser,
  githubAuthorizeUrl,
} from '../../../src/auth/github';

const CONFIG = { clientId: 'client-123', clientSecret: 'secret-456' };
const REDIRECT = 'http://localhost:8787/callback';

interface Call {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

/** A fake fetch that records calls and answers with the given status and JSON body. */
function fakeFetch(status: number, body: unknown): { fetchFn: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe('githubAuthorizeUrl', () => {
  it('builds the GitHub sign-in URL without requesting any permissions', () => {
    const url = new URL(githubAuthorizeUrl(CONFIG, REDIRECT, 'state-1'));

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.has('scope')).toBe(false);
  });
});

describe('exchangeGithubCode', () => {
  it('exchanges a code for an access token', async () => {
    const { fetchFn, calls } = fakeFetch(200, { access_token: 'gho_abc', token_type: 'bearer' });

    const token = await exchangeGithubCode(fetchFn, CONFIG, 'code-789', REDIRECT);

    const body = calls[0]?.init?.body;
    expect(token).toBe('gho_abc');
    expect(calls[0]?.url).toBe('https://github.com/login/oauth/access_token');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(body instanceof URLSearchParams ? body.get('code') : null).toBe('code-789');
  });

  it('rejects a response without an access token', async () => {
    const { fetchFn } = fakeFetch(200, { error: 'bad_verification_code' });

    await expect(exchangeGithubCode(fetchFn, CONFIG, 'old-code', REDIRECT)).rejects.toThrow(
      GithubAuthError,
    );
  });

  it('rejects a failed request', async () => {
    const { fetchFn } = fakeFetch(500, {});

    await expect(exchangeGithubCode(fetchFn, CONFIG, 'code-789', REDIRECT)).rejects.toThrow(
      GithubAuthError,
    );
  });
});

describe('fetchGithubUser', () => {
  it("reads the user's numeric id and login", async () => {
    const { fetchFn, calls } = fakeFetch(200, {
      id: 210321753,
      login: 'AliNouman007',
      name: 'Ali',
    });

    const user = await fetchGithubUser(fetchFn, 'gho_abc');

    const headers = calls[0]?.init?.headers as Record<string, string> | undefined;
    expect(user).toEqual({ id: '210321753', login: 'AliNouman007' });
    expect(headers?.Authorization).toBe('Bearer gho_abc');
    expect(headers?.['User-Agent']).toBe('tutnora-mcp');
  });

  it('rejects a profile without a numeric id', async () => {
    const { fetchFn } = fakeFetch(200, { login: 'AliNouman007' });

    await expect(fetchGithubUser(fetchFn, 'gho_abc')).rejects.toThrow(GithubAuthError);
  });
});
