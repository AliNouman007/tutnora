// HTML for the consent screen and sign-in messages. Every dynamic value is escaped.

const STYLE =
  'body{font-family:system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 1rem;line-height:1.5}button{font-size:1rem;padding:.5rem 1rem;margin-right:.5rem}code{word-break:break-all}';

export interface ConsentPage {
  readonly clientName: string;
  readonly redirectUri: string;
  readonly consentToken: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · Tutnora</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}

export function renderConsentPage(page: ConsentPage): string {
  return layout(
    'Allow access',
    `<h1>Allow access to Tutnora?</h1>
<p><strong>${escapeHtml(page.clientName)}</strong> wants to use your Tutnora learning record: your goals, roadmaps, progress, and session notes.</p>
<p>If you allow it, you will sign in with GitHub next. Tutnora reads only your public GitHub profile.</p>
<p>Access will be returned to: <code>${escapeHtml(page.redirectUri)}</code></p>
<p>If you did not start this, choose Deny.</p>
<form method="post" action="/authorize">
<input type="hidden" name="consent_token" value="${escapeHtml(page.consentToken)}">
<button type="submit" name="decision" value="approve">Allow</button>
<button type="submit" name="decision" value="deny">Deny</button>
</form>`,
  );
}

export function renderMessagePage(title: string, message: string): string {
  return layout(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`);
}

/** An HTML response that cannot be framed, cached, or used to load other content. */
export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    },
  });
}
