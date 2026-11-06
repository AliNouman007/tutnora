import { describe, expect, it } from 'vitest';
import { escapeHtml, htmlResponse, renderConsentPage } from '../../../src/auth/pages';

describe('sign-in pages', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;',
    );
  });

  it('shows the requesting app safely on the consent page', () => {
    const html = renderConsentPage({
      clientName: '<b>Evil app</b>',
      redirectUri: 'http://localhost:3334/callback',
      consentToken: 'token-1',
    });

    expect(html).toContain('&lt;b&gt;Evil app&lt;/b&gt;');
    expect(html).not.toContain('<b>Evil app</b>');
    expect(html).toContain('http://localhost:3334/callback');
    expect(html).toContain('name="consent_token" value="token-1"');
    expect(html).toContain('value="approve"');
    expect(html).toContain('value="deny"');
  });

  it('sends pages that cannot be framed or cached', () => {
    const response = htmlResponse('<p>Hello</p>', 403);

    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
