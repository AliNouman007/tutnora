import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server';
import { createAuthHandler } from './auth/handler';
import type { AuthHandlerDependencies } from './auth/handler';
import { isLearnerProps } from './env';
import type { WorkerEnv } from './env';
import { createTutnoraHandler } from './mcp/server';

// Wiring only: sign-in, the /mcp endpoint, and the OAuth endpoints (ADR 0005).

/** Hostnames allowed in the Host and browser Origin headers of /mcp requests. */
function allowedHosts(env: WorkerEnv): string[] {
  return env.ALLOWED_HOSTS.split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0);
}

/**
 * Serves /mcp. The OAuth provider has already validated the bearer token.
 * `satisfies` checks the handler's shape while keeping `fetch` required, as the provider expects.
 */
const mcpApiHandler = {
  fetch(request, env, ctx) {
    const hosts = allowedHosts(env);
    const rejected =
      hostHeaderValidationResponse(request, hosts) ?? originValidationResponse(request, hosts);
    if (rejected) {
      return rejected;
    }
    if (!isLearnerProps(ctx.props)) {
      return new Response('Unauthorized', { status: 401 });
    }
    const handler = createTutnoraHandler({
      db: env.DB,
      identity: { learnerId: ctx.props.learnerId, githubLogin: ctx.props.githubLogin },
      now: () => new Date(),
    });
    return handler.fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;

/**
 * Builds the Worker for one public URL, such as http://localhost:8787.
 * Tests pass a fake GitHub; the deployed Worker uses the real network.
 */
export function createWorker(
  dependencies: AuthHandlerDependencies,
  publicUrl: string,
): OAuthProvider<WorkerEnv> {
  const origin = publicUrl.replace(/\/+$/, '');
  return new OAuthProvider<WorkerEnv>({
    apiRoute: '/mcp',
    apiHandler: mcpApiHandler,
    defaultHandler: createAuthHandler(dependencies),
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/oauth/token',
    clientRegistrationEndpoint: '/oauth/register',
    // Off: chatgpt.com refuses server-side fetches of Codex's client metadata (HTTP 403), so
    // clients register through Dynamic Client Registration instead. Revisit in milestone M6.
    clientIdMetadataDocumentEnabled: false,
    // RFC 9728 metadata: tells apps that /mcp is protected and where to sign in.
    // Tokens are issued for this exact resource URL.
    resourceMetadata: {
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      resource_name: 'Tutnora',
      bearer_methods_supported: ['header'],
    },
  });
}

const network: AuthHandlerDependencies = { fetch: (input, init) => fetch(input, init) };
let worker: OAuthProvider<WorkerEnv> | undefined;

/** The deployed Worker. Built on the first request, because PUBLIC_URL comes from the environment. */
export default {
  fetch(request, env, ctx) {
    worker ??= createWorker(network, env.PUBLIC_URL);
    return worker.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<WorkerEnv>;
