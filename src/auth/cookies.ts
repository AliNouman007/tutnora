// Sign-in cookies: readable only by the server, sent only to Tutnora, and short-lived.

export interface CookieOptions {
  readonly path: string;
  readonly maxAgeSeconds: number;
  /** Secure on HTTPS; plain HTTP is used only for local development on localhost. */
  readonly secure: boolean;
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearCookie(name: string, path: string, secure: boolean): string {
  return serializeCookie(name, '', { path, maxAgeSeconds: 0, secure });
}

/** Reads one cookie from a Cookie header, or returns null if it is absent. */
export function readCookie(header: string | null, name: string): string | null {
  if (header === null) {
    return null;
  }
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return null;
}
