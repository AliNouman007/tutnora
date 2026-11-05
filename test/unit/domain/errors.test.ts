import { describe, expect, it } from 'vitest';
import { AppError, ERROR_CODES, isAppError } from '../../../src/domain/errors';

describe('AppError', () => {
  it('carries a code and a safe message', () => {
    const error = new AppError('NOT_FOUND', 'Topic not found.');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Topic not found.');
  });

  it('lists the documented error codes', () => {
    expect(ERROR_CODES).toEqual(['VALIDATION', 'NOT_FOUND', 'FORBIDDEN', 'CONFLICT', 'INTERNAL']);
  });
});

describe('isAppError', () => {
  it('recognises AppError instances only', () => {
    expect(isAppError(new AppError('INTERNAL', 'Unexpected error.'))).toBe(true);
    expect(isAppError(new Error('plain error'))).toBe(false);
    expect(isAppError('NOT_FOUND')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
