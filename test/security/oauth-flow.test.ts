import { describe, expect, it } from 'vitest';
import {
  CLIENT_REDIRECT,
  beginSignIn,
  callToolWithToken,
  cookieValue,
  decide,
  fakeGithub,
  returnFromGithub,
  signIn,
  testWorker,
} from '../helpers/oauth-flow';

const SARA = { id: 1001, login: 'sara' };
const STRANGER = { id: 2002, login: 'stranger' };
const TOOLS_LIST = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

describe('sign-in and access to /mcp', () => {
  it('rejects /mcp without a token', async () => {
    const call = testWorker(fakeGithub(SARA));

    const response = await call('/mcp', { method: 'POST', headers: MCP_HEADERS, body: TOOLS_LIST });

    expect(response.status).toBe(401);
  });

  it('signs in an invited GitHub user and serves tools as that learner', async () => {
    const call = testWorker(fakeGithub(SARA));

    const token = await signIn(call);
    const session = await callToolWithToken(call, token, 'start_session');

    expect(session).toMatchObject({ isNewLearner: true, learner: { githubLogin: 'sara' } });
  });

  it('stops a GitHub user who is not on the invite list', async () => {
    const call = testWorker(fakeGithub(STRANGER));
    const { consent, consentToken } = await beginSignIn(call);
    const approved = await decide(
      call,
      consentToken,
      'approve',
      cookieValue(consent, 'tutnora_consent'),
    );
    const state = new URL(approved.headers.get('Location') ?? '').searchParams.get('state') ?? '';

    const back = await returnFromGithub(call, state, cookieValue(approved, 'tutnora_state'));

    expect(back.status).toBe(403);
    expect(back.headers.get('Location')).toBeNull();
    expect(await back.text()).toContain('invite-only');
  });

  it('rejects a GitHub return whose state does not match, or that is replayed', async () => {
    const call = testWorker(fakeGithub(SARA));
    const { consent, consentToken } = await beginSignIn(call);
    const approved = await decide(
      call,
      consentToken,
      'approve',
      cookieValue(consent, 'tutnora_consent'),
    );
    const state = new URL(approved.headers.get('Location') ?? '').searchParams.get('state') ?? '';
    const stateCookie = cookieValue(approved, 'tutnora_state');

    const mismatched = await returnFromGithub(call, state, 'not-the-right-cookie');
    const first = await returnFromGithub(call, state, stateCookie);
    const replayed = await returnFromGithub(call, state, stateCookie);

    expect(mismatched.status).toBe(400);
    expect(first.status).toBe(302);
    expect(replayed.status).toBe(400);
  });

  it('ignores a consent decision sent without the consent cookie', async () => {
    const call = testWorker(fakeGithub(SARA));
    const { consentToken } = await beginSignIn(call);

    const response = await decide(call, consentToken, 'approve', null);

    expect(response.status).toBe(400);
  });

  it('returns access_denied to the app when the learner chooses Deny', async () => {
    const call = testWorker(fakeGithub(SARA));
    const { consent, consentToken } = await beginSignIn(call);

    const response = await decide(
      call,
      consentToken,
      'deny',
      cookieValue(consent, 'tutnora_consent'),
    );
    const location = new URL(response.headers.get('Location') ?? '');

    expect(response.status).toBe(302);
    expect(`${location.origin}${location.pathname}`).toBe(CLIENT_REDIRECT);
    expect(location.searchParams.get('error')).toBe('access_denied');
    expect(location.searchParams.get('state')).toBe('client-state');
  });

  it("rejects /mcp requests from another website's Origin", async () => {
    const call = testWorker(fakeGithub(SARA));
    const token = await signIn(call);

    const response = await call('/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${token}`, Origin: 'https://evil.example' },
      body: TOOLS_LIST,
    });

    expect(response.status).toBe(403);
  });

  it('rejects /mcp requests sent to an unknown host', async () => {
    const call = testWorker(fakeGithub(SARA));
    const token = await signIn(call);

    const response = await call(
      new Request('http://evil.example/mcp', {
        method: 'POST',
        headers: { ...MCP_HEADERS, Authorization: `Bearer ${token}` },
        body: TOOLS_LIST,
      }),
    );

    expect([401, 403]).toContain(response.status);
  });

  it('offers Dynamic Client Registration and does not advertise CIMD', async () => {
    const call = testWorker(fakeGithub(SARA));

    const response = await call('/.well-known/oauth-authorization-server');
    const metadata = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(metadata.registration_endpoint).toBe('http://localhost/oauth/register');
    expect(metadata.client_id_metadata_document_supported).not.toBe(true);
  });
});
