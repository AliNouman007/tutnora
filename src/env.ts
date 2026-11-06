import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

/** The Worker's bindings, plus the OAuth helpers that the OAuth provider adds at runtime. */
export interface WorkerEnv extends Env {
  OAUTH_PROVIDER: OAuthHelpers;
}

/** Who signed in. Stored encrypted by the OAuth provider and passed with every /mcp request. */
export interface LearnerProps {
  learnerId: string;
  githubLogin: string;
}

export function isLearnerProps(value: unknown): value is LearnerProps {
  return (
    typeof value === 'object' &&
    value !== null &&
    'learnerId' in value &&
    typeof value.learnerId === 'string' &&
    value.learnerId.length > 0 &&
    'githubLogin' in value &&
    typeof value.githubLogin === 'string'
  );
}
