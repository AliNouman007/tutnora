export const ERROR_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'CONFLICT',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** An expected failure with a stable code. Its message must be safe to show to an assistant. */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
