import { AuthorizationError } from '@cloudflare/workers-oauth-provider';
import type { AuthRequest } from '@cloudflare/workers-oauth-provider';
import type { LearnerProps, WorkerEnv } from '../env';
import { parseAllowedGithubIds } from './allowlist';
import { clearCookie, readCookie, serializeCookie } from './cookies';
import { GithubAuthError, exchangeGithubCode, fetchGithubUser, githubAuthorizeUrl } from './github';
import type { GithubConfig, GithubUser } from './github';
import { htmlResponse, renderConsentPage, renderMessagePage } from './pages';
import { savePending, takePending } from './pending';

const CONSENT_COOKIE = 'tutnora_consent';
const STATE_COOKIE = 'tutnora_state';
const COOKIE_MAX_AGE_SECONDS = 600;
const EXPIRED_MESSAGE = 'This sign-in page has expired. Please start again from your app.';

export interface AuthHandlerDependencies {
  /** Used for requests to GitHub. Tests pass a fake GitHub. */
  readonly fetch: typeof fetch;
}

/**
 * Serves the sign-in pages: the consent screen at /authorize and GitHub's return at /callback.
 * The OAuth provider sends every request that is not an OAuth endpoint or /mcp here.
 */
export function createAuthHandler(deps: AuthHandlerDependencies): ExportedHandler<WorkerEnv> {
  return {
    async fetch(request, env) {
      try {
        const { pathname } = new URL(request.url);
        if (pathname === '/authorize' && request.method === 'GET') {
          return await showConsent(request, env);
        }
        if (pathname === '/authorize' && request.method === 'POST') {
          return await handleConsentDecision(request, env);
        }
        if (pathname === '/callback' && request.method === 'GET') {
          return await handleGithubCallback(request, env, deps);
        }
        return message('Not found', 'There is nothing here.', 404);
      } catch (error) {
        const name = error instanceof Error ? error.name : 'unknown';
        console.error(JSON.stringify({ event: 'auth_error', name }));
        return message(
          'Sign-in failed',
          'Something went wrong. Please try again from your app.',
          500,
        );
      }
    },
  };
}

async function showConsent(request: Request, env: WorkerEnv): Promise<Response> {
  let authRequest: AuthRequest;
  try {
    authRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) {
      throw error;
    }
    if (!error.redirectUri) {
      return message('Sign-in request rejected', error.description, 400);
    }
    const target = new URL(error.redirectUri);
    target.searchParams.set('error', error.code);
    target.searchParams.set('error_description', error.description);
    if (error.state) {
      target.searchParams.set('state', error.state);
    }
    if (error.issuer) {
      target.searchParams.set('iss', error.issuer);
    }
    return redirect(target.toString());
  }

  const client = await env.OAUTH_PROVIDER.lookupClient(authRequest.clientId);
  if (!client) {
    return message('Unknown app', 'This app is not registered with Tutnora.', 400);
  }

  const consentToken = await savePending(env.OAUTH_KV, 'consent', authRequest);
  const response = htmlResponse(
    renderConsentPage({
      clientName: client.clientName ?? authRequest.clientId,
      redirectUri: authRequest.redirectUri,
      consentToken,
    }),
  );
  response.headers.append(
    'Set-Cookie',
    serializeCookie(CONSENT_COOKIE, consentToken, {
      path: '/authorize',
      maxAgeSeconds: COOKIE_MAX_AGE_SECONDS,
      secure: isSecure(request),
    }),
  );
  return response;
}

async function handleConsentDecision(request: Request, env: WorkerEnv): Promise<Response> {
  const form = await request.formData();
  const token = form.get('consent_token');
  const decision = form.get('decision');
  const cookieToken = readCookie(request.headers.get('Cookie'), CONSENT_COOKIE);
  if (typeof token !== 'string' || cookieToken === null || cookieToken !== token) {
    return message('Sign-in expired', EXPIRED_MESSAGE, 400);
  }

  const authRequest = await takePending(env.OAUTH_KV, 'consent', token);
  if (!isAuthRequest(authRequest)) {
    return message('Sign-in expired', EXPIRED_MESSAGE, 400);
  }

  const secure = isSecure(request);
  const clearConsent = clearCookie(CONSENT_COOKIE, '/authorize', secure);
  if (decision !== 'approve') {
    return errorRedirect(authRequest, 'access_denied', 'The learner denied access.', [
      clearConsent,
    ]);
  }

  const config = githubConfig(env);
  if (config === null) {
    return message('Sign-in unavailable', 'GitHub sign-in is not configured on this server.', 500);
  }

  const state = await savePending(env.OAUTH_KV, 'github-state', authRequest);
  const callbackUrl = new URL('/callback', request.url).toString();
  return redirect(githubAuthorizeUrl(config, callbackUrl, state), [
    clearConsent,
    serializeCookie(STATE_COOKIE, state, {
      path: '/callback',
      maxAgeSeconds: COOKIE_MAX_AGE_SECONDS,
      secure,
    }),
  ]);
}

async function handleGithubCallback(
  request: Request,
  env: WorkerEnv,
  deps: AuthHandlerDependencies,
): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const cookieState = readCookie(request.headers.get('Cookie'), STATE_COOKIE);
  if (state === null || code === null || cookieState === null || cookieState !== state) {
    return message('Sign-in expired', EXPIRED_MESSAGE, 400);
  }

  const authRequest = await takePending(env.OAUTH_KV, 'github-state', state);
  if (!isAuthRequest(authRequest)) {
    return message('Sign-in expired', EXPIRED_MESSAGE, 400);
  }

  const config = githubConfig(env);
  if (config === null) {
    return message('Sign-in unavailable', 'GitHub sign-in is not configured on this server.', 500);
  }

  let user: GithubUser;
  try {
    const callbackUrl = new URL('/callback', request.url).toString();
    const githubToken = await exchangeGithubCode(deps.fetch, config, code, callbackUrl);
    user = await fetchGithubUser(deps.fetch, githubToken);
  } catch (error) {
    if (!(error instanceof GithubAuthError)) {
      throw error;
    }
    return message(
      'GitHub sign-in failed',
      'GitHub did not complete the sign-in. Please try again.',
      502,
    );
  }

  if (!parseAllowedGithubIds(env.ALLOWED_GITHUB_IDS).has(user.id)) {
    return message(
      'Tutnora is invite-only',
      `The GitHub account @${user.login} is not on the invite list yet.`,
      403,
    );
  }

  const props: LearnerProps = { learnerId: user.id, githubLogin: user.login };
  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: authRequest,
    userId: user.id,
    metadata: { githubLogin: user.login },
    scope: authRequest.scope,
    props,
  });
  return redirect(redirectTo, [clearCookie(STATE_COOKIE, '/callback', isSecure(request))]);
}

function githubConfig(env: WorkerEnv): GithubConfig | null {
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

function isAuthRequest(value: unknown): value is AuthRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'clientId' in value &&
    typeof value.clientId === 'string' &&
    'redirectUri' in value &&
    typeof value.redirectUri === 'string' &&
    'scope' in value &&
    Array.isArray(value.scope)
  );
}

function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

function message(title: string, text: string, status: number): Response {
  return htmlResponse(renderMessagePage(title, text), status);
}

function redirect(location: string, cookies: readonly string[] = []): Response {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(null, { status: 302, headers });
}

/** Returns the learner to the app with an OAuth error, keeping the app's state and issuer. */
function errorRedirect(
  authRequest: AuthRequest,
  code: string,
  description: string,
  cookies: readonly string[],
): Response {
  const target = new URL(authRequest.redirectUri);
  target.searchParams.set('error', code);
  target.searchParams.set('error_description', description);
  if (authRequest.state) {
    target.searchParams.set('state', authRequest.state);
  }
  if (authRequest.issuer) {
    target.searchParams.set('iss', authRequest.issuer);
  }
  return redirect(target.toString(), cookies);
}
