import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { randomToken } from '../../src/auth/pending';
import type { WorkerEnv } from '../../src/env';
import { createWorker } from '../../src/index';
import { readOutcome } from './mcp-client';

export const BASE_URL = 'http://localhost';
export const CLIENT_REDIRECT = 'http://localhost:9999/callback';

export type WorkerFetch = (input: string | Request, init?: RequestInit) => Promise<Response>;

/** A fake GitHub that signs in the given user. */
export function fakeGithub(user: { id: number; login: string }): typeof fetch {
  return (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString();
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    if (url === 'https://github.com/login/oauth/access_token') {
      return Promise.resolve(json({ access_token: 'gho_test', token_type: 'bearer' }));
    }
    if (url === 'https://api.github.com/user') {
      return Promise.resolve(json(user));
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  };
}

/** Calls the real Worker (OAuth provider, sign-in pages, and /mcp) in process. */
export function testWorker(github: typeof fetch): WorkerFetch {
  const worker = createWorker({ fetch: github }, BASE_URL);
  return async (input, init) => {
    const built = input instanceof Request ? input : new Request(new URL(input, BASE_URL), init);
    // Real HTTP requests always carry a Host header; requests built in tests do not.
    const headers = new Headers(built.headers);
    if (!headers.has('Host')) {
      headers.set('Host', new URL(built.url).host);
    }
    const request = new Request(built, { headers });
    const ctx = createExecutionContext();
    // The OAuth provider adds OAUTH_PROVIDER to env itself, so the test env does not have it.
    const response = await worker.fetch(request, env as unknown as WorkerEnv, ctx);
    await waitOnExecutionContext(ctx);
    return response;
  };
}

export function cookieValue(response: Response, name: string): string {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const [key, value] = (pair ?? '').split('=');
    if (key === name && value) {
      return value;
    }
  }
  throw new Error(`Cookie ${name} was not set.`);
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** Registers a test MCP client and opens the consent page, as an assistant would. */
export async function beginSignIn(call: WorkerFetch) {
  const registration = await call('/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Test MCP client',
      redirect_uris: [CLIENT_REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  if (!registration.ok) {
    throw new Error(`Registration failed: ${registration.status} ${await registration.text()}`);
  }
  const { client_id: clientId } = await registration.json<{ client_id: string }>();

  const verifier = randomToken();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CLIENT_REDIRECT,
    code_challenge: base64url(new Uint8Array(digest)),
    code_challenge_method: 'S256',
    state: 'client-state',
  });
  const consent = await call(`/authorize?${params.toString()}`);
  const html = await consent.text();
  const consentToken = /name="consent_token" value="([^"]+)"/.exec(html)?.[1] ?? '';
  return { clientId, verifier, consent, consentToken };
}

/** Submits the consent form with the given decision and cookie. */
export function decide(
  call: WorkerFetch,
  consentToken: string,
  decision: 'approve' | 'deny',
  cookie: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (cookie !== null) {
    headers.Cookie = `tutnora_consent=${cookie}`;
  }
  return call('/authorize', {
    method: 'POST',
    headers,
    body: new URLSearchParams({ consent_token: consentToken, decision }).toString(),
  });
}

/** Simulates GitHub sending the learner back to /callback. */
export function returnFromGithub(
  call: WorkerFetch,
  state: string,
  cookie: string,
): Promise<Response> {
  return call(`/callback?code=github-code&state=${state}`, {
    headers: { Cookie: `tutnora_state=${cookie}` },
  });
}

/** Runs the whole sign-in and returns an access token for /mcp. */
export async function signIn(call: WorkerFetch): Promise<string> {
  const { clientId, verifier, consent, consentToken } = await beginSignIn(call);
  const approved = await decide(
    call,
    consentToken,
    'approve',
    cookieValue(consent, 'tutnora_consent'),
  );
  const state = new URL(approved.headers.get('Location') ?? '').searchParams.get('state') ?? '';
  const back = await returnFromGithub(call, state, cookieValue(approved, 'tutnora_state'));
  const code = new URL(back.headers.get('Location') ?? '').searchParams.get('code') ?? '';

  const tokenResponse = await call('/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CLIENT_REDIRECT,
      client_id: clientId,
      code_verifier: verifier,
    }).toString(),
  });
  const tokens = await tokenResponse.json<{ access_token?: string }>();
  if (!tokens.access_token) {
    throw new Error(`Token exchange failed: ${tokenResponse.status}`);
  }
  return tokens.access_token;
}

/** Calls one tool through /mcp with a bearer token, as a signed-in assistant would. */
export async function callToolWithToken(
  call: WorkerFetch,
  token: string,
  name: string,
): Promise<unknown> {
  const transport = new StreamableHTTPClientTransport(new URL('/mcp', BASE_URL), {
    fetch: (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return call(new Request(url, { ...init, headers }));
    },
  });
  const client = new Client(
    { name: 'tutnora-tests', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  );
  await client.connect(transport);
  const result: unknown = await client.callTool({ name, arguments: {} });
  await client.close();
  const outcome = readOutcome(result);
  if (outcome.isError) {
    throw new Error(`Tool ${name} failed: ${outcome.text}`);
  }
  return JSON.parse(outcome.text) as unknown;
}
