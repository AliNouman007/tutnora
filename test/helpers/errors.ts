import { expect } from 'vitest';
import { isAppError } from '../../src/domain/errors';
import type { ErrorCode } from '../../src/domain/errors';

/** Asserts that the promise rejects with an AppError carrying the given code. */
export async function expectAppError(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(isAppError(error) ? error.code : error).toBe(code);
    return;
  }
  throw new Error(`Expected an AppError with code ${code}, but the call succeeded.`);
}
