import type { LearnerIdentity } from '../services/session';

/** Everything a tool needs for one request. The identity comes only from sign-in (ADR 0004). */
export interface ToolContext {
  readonly db: D1Database;
  readonly identity: LearnerIdentity;
  /** Reads the clock. Each tool call reads it once and passes the time down. */
  readonly now: () => Date;
}
