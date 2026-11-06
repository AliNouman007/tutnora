/**
 * Parses ALLOWED_GITHUB_IDS: a comma-separated list of GitHub numeric user ids (ADR 0004).
 * Entries that are not positive integers are ignored, so a mistake allows fewer people, never more.
 */
export function parseAllowedGithubIds(value: string | undefined): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const part of (value ?? '').split(',')) {
    const id = part.trim();
    if (/^[1-9][0-9]{0,19}$/.test(id)) {
      ids.add(id);
    }
  }
  return ids;
}
