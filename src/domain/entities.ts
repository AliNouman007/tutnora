import type {
  EvidenceKind,
  EvidenceResult,
  EvidenceSupport,
  GoalMode,
  GoalPurpose,
  GoalStatus,
  TopicTier,
} from './types';

// Stored records as the rest of the application sees them (docs/ARCHITECTURE.md section 4).

export interface Learner {
  readonly id: string;
  readonly githubLogin: string;
  /** Null until the learner chooses a language during onboarding. */
  readonly language: string | null;
  readonly hintLimit: number;
  readonly sessionMinutes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Goal {
  readonly id: string;
  readonly learnerId: string;
  readonly title: string;
  readonly purpose: GoalPurpose;
  readonly targetLevel: string | null;
  readonly mode: GoalMode;
  readonly status: GoalStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Topic {
  readonly id: string;
  readonly learnerId: string;
  readonly goalId: string;
  readonly key: string;
  readonly parentKey: string | null;
  readonly title: string;
  readonly tier: TopicTier;
  readonly position: number;
  readonly sources: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Evidence {
  readonly id: string;
  readonly learnerId: string;
  readonly goalId: string;
  readonly topicId: string;
  readonly kind: EvidenceKind;
  readonly support: EvidenceSupport;
  readonly result: EvidenceResult;
  readonly note: string | null;
  readonly requestId: string | null;
  readonly createdAt: Date;
}

export interface Handoff {
  readonly id: string;
  readonly learnerId: string;
  readonly goalId: string;
  readonly summary: string;
  readonly nextStep: string;
  readonly openQuestions: string | null;
  readonly createdAt: Date;
}
