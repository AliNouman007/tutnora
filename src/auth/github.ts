// Talks to GitHub for sign-in. Requests no scopes, so only the public profile is available.

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';

export interface GithubConfig {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface GithubUser {
  /** GitHub numeric user id, as text. This is the learner id (ADR 0004). */
  readonly id: string;
  readonly login: string;
}

/** A failure talking to GitHub. Its message never contains tokens or secrets. */
export class GithubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GithubAuthError';
  }
}

/** The GitHub page where the learner signs in. */
export function githubAuthorizeUrl(
  config: GithubConfig,
  redirectUri: string,
  state: string,
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'false');
  return url.toString();
}

/** Exchanges the code GitHub returned for a short-lived GitHub access token. */
export async function exchangeGithubCode(
  fetchFn: typeof fetch,
  config: GithubConfig,
  code: string,
  redirectUri: string,
): Promise<string> {
  const response = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!response.ok) {
    throw new GithubAuthError('GitHub token exchange failed.');
  }
  const body: unknown = await response.json();
  if (isRecord(body) && typeof body.access_token === 'string' && body.access_token.length > 0) {
    return body.access_token;
  }
  throw new GithubAuthError('GitHub did not return an access token.');
}

/** Reads the signed-in GitHub user's numeric id and login. */
export async function fetchGithubUser(
  fetchFn: typeof fetch,
  accessToken: string,
): Promise<GithubUser> {
  const response = await fetchFn(USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'tutnora-mcp',
    },
  });
  if (!response.ok) {
    throw new GithubAuthError('GitHub user lookup failed.');
  }
  const body: unknown = await response.json();
  if (
    isRecord(body) &&
    typeof body.id === 'number' &&
    Number.isSafeInteger(body.id) &&
    body.id > 0 &&
    typeof body.login === 'string' &&
    body.login.length > 0
  ) {
    return { id: String(body.id), login: body.login };
  }
  throw new GithubAuthError('GitHub returned an unexpected user profile.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
