import { AppError } from '../domain/errors';

/** Returns a row the database must return, such as the result of INSERT ... RETURNING. */
export function requireRow<T>(row: T | null): T {
  if (row === null) {
    throw new AppError('INTERNAL', 'The database did not return the expected record.');
  }
  return row;
}

/** Parses the topics.sources column, which stores a JSON array of URLs. */
export function parseSources(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!isStringArray(parsed)) {
    throw new AppError('INTERNAL', 'Stored topic sources are invalid.');
  }
  return parsed;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
