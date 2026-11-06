# Security Policy

## Supported versions

Tutnora is pre-alpha. Only the latest commit on `main` and the current production deployment receive security fixes.

## Reporting a vulnerability

Please **do not** open a public issue.

Report privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Include steps to reproduce, the impact, and any suggested fix.

Tutnora is maintained by a small team. We aim to acknowledge reports within 7 days and will keep you informed while we work on a fix. Please allow reasonable time for a fix before disclosing the issue publicly.

## Scope

In scope: the code in this repository and the official Tutnora deployment.

Out of scope: vulnerabilities in ChatGPT, Claude, GitHub, or Cloudflare themselves. Please report those to the respective vendor.

## Security model

### Authentication

- Learners sign in with GitHub through OAuth 2.1, implemented with `@cloudflare/workers-oauth-provider` ([ADR 0001](docs/decisions/0001-remote-mcp-on-cloudflare.md)).
- The server issues its own tokens to assistants. GitHub tokens are never passed to assistants.
- Tutnora does not request access to learners' email addresses or repositories.
- During the MVP, only GitHub accounts listed in `ALLOWED_GITHUB_IDS` can sign in.
- Before signing in, the learner sees Tutnora's own consent page, which names the requesting app and where access will be returned, and must choose Allow.
- Sign-in state is single-use, expires after 10 minutes, and is bound to HTTP-only, same-site cookies.
- `/mcp` rejects requests whose `Host` or browser `Origin` is not listed in `ALLOWED_HOSTS`.

### Authorization and data isolation

- Learners are identified by their GitHub numeric user ID ([ADR 0004](docs/decisions/0004-github-identity-and-isolation.md)).
- The learner ID comes only from the authenticated session. No tool accepts it as input.
- Every table has a `learner_id` column, and every query filters by it.
- A record belonging to another learner is reported as not found.
- Isolation is verified by mandatory security tests ([TESTING.md](docs/TESTING.md), section 6).

### Input handling

- All tool input is validated with strict schemas at the tool boundary. Unknown fields are rejected.
- Text fields have maximum lengths.
- SQL uses prepared statements with bound parameters. SQL built from strings is not allowed.

### Prompt injection

- Text stored by learners or assistants is returned as data, never as instructions.
- The tutor playbook is controlled by the server and cannot be changed through tools.
- Tools act only on the authenticated learner's own data, which limits what a manipulated assistant can do.
- Deleting data requires an exact confirmation value.

### Errors and logging

- Errors returned to assistants never include stack traces, SQL, or other learners' data.
- Logs contain tool names, error codes, and timing only. They never contain learner content, tokens, or secrets.

### Secrets

- Secrets are stored as Cloudflare Worker secrets for each environment.
- Local secrets live in `.dev.vars`, which Git ignores. `.dev.vars.example` lists the required names without values.
- GitHub secret scanning and push protection are enabled on the repository.

### Dependencies

- Adding a runtime dependency requires an approved ADR.
- Dependabot alerts are enabled. Dependency updates go through the normal CI and review process.

## Known limitations

- During the MVP, the sign-up allowlist is the only form of rate limiting.
- The service operator has technical access to the database. See [PRIVACY.md](docs/PRIVACY.md).
- Conversations happen inside the learner's AI assistant and are governed by that provider's policies.
