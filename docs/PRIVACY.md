# Privacy

This document explains what Tutnora stores about you, who can access it, and how to export or delete it.

> Tutnora is pre-alpha and invite-only. This document will be reviewed before public launch.

## What Tutnora stores

| Data | Example | Why |
|---|---|---|
| GitHub numeric user ID and username | `12345678`, `octocat` | To identify you and keep your data separate |
| Learning preferences | Teaching language, hint limit, session length | To personalise teaching |
| Goals | "Frontend interview preparation, mid-level" | To organise your learning |
| Roadmap topics | `css.layout.position`, its tier, and reference links | To plan and track coverage |
| Evidence | Kind of question, support given, result, and a short note of up to 500 characters | To calculate progress and revision |
| Session handoffs | A short summary, the next step, and open questions | To resume where you left off |

Full field definitions are in [ARCHITECTURE.md](ARCHITECTURE.md), section 4.

## What Tutnora does not store

- Your conversations with your AI assistant
- Code you write or submit
- Your email address, GitHub tokens, or GitHub repositories
- Any data other than the fields listed above

The tutor saves short summaries and notes, not transcripts.

## Where your data goes

| Party | What it processes | Governed by |
|---|---|---|
| Cloudflare | Hosts the server and database | Cloudflare's privacy policy |
| GitHub | Handles sign-in | GitHub's privacy statement |
| Your AI assistant provider, for example OpenAI or Anthropic | Your conversation, and the Tutnora data returned to your assistant during a session | That provider's policies and your account settings |

Tutnora does not sell data or use it for advertising.

## Who can access your data

- **Other learners cannot.** Isolation is enforced in code and verified by automated tests.
- **The service operator** has technical access to the database for running and fixing the service, and uses it only for that purpose.

## Your controls

- **View:** ask your assistant for your progress (`get_progress`).
- **Export:** ask your assistant to export your data (`export_my_data`). You receive all your stored data as JSON.
- **Delete:** ask your assistant to delete your data (`delete_my_data`) and confirm with the exact phrase `DELETE MY TUTNORA DATA`. This permanently removes all your records from the live database and cannot be undone.

Cloudflare D1 keeps point-in-time recovery history for a limited period. Deleted data may remain in that history until it expires. The exact retention period will be documented here before public launch.

## Retention

Your data is kept until you delete it. If your account is removed from the invite list, your data remains until you ask the operator to delete it.

## Contact

For privacy questions, open an issue in the repository. For security concerns, follow [SECURITY.md](../SECURITY.md).
