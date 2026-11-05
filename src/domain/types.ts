// Allowed values for stored fields (docs/ARCHITECTURE.md section 4).
// Each list is the single source of truth; its type is derived from it.

export const TOPIC_TIERS = ['core', 'working', 'awareness'] as const;
export type TopicTier = (typeof TOPIC_TIERS)[number];

export const EVIDENCE_KINDS = [
  'explain',
  'predict_output',
  'debug',
  'build',
  'interview_answer',
  'recall',
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_SUPPORTS = [
  'independent',
  'hinted',
  'ai_assisted',
  'solution_shown',
] as const;
export type EvidenceSupport = (typeof EVIDENCE_SUPPORTS)[number];

export const EVIDENCE_RESULTS = ['pass', 'partial', 'fail'] as const;
export type EvidenceResult = (typeof EVIDENCE_RESULTS)[number];

export const TOPIC_STATUSES = [
  'not_started',
  'learning',
  'practised',
  'demonstrated',
  'needs_revision',
] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export const GOAL_PURPOSES = ['interview', 'project', 'revision', 'skill', 'other'] as const;
export type GoalPurpose = (typeof GOAL_PURPOSES)[number];

export const GOAL_MODES = ['topic', 'project', 'mixed'] as const;
export type GoalMode = (typeof GOAL_MODES)[number];

export const GOAL_STATUSES = ['active', 'paused', 'done'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
