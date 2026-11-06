import type { Goal, Handoff, Learner, Topic } from '../domain/entities';

// The shapes tools return to the assistant. Internal fields stay out of tool results.

export function presentLearner(learner: Learner) {
  return {
    githubLogin: learner.githubLogin,
    language: learner.language,
    hintLimit: learner.hintLimit,
    sessionMinutes: learner.sessionMinutes,
  };
}

export function presentGoal(goal: Goal) {
  return {
    id: goal.id,
    title: goal.title,
    purpose: goal.purpose,
    targetLevel: goal.targetLevel,
    mode: goal.mode,
    status: goal.status,
  };
}

export function presentTopic(topic: Topic) {
  return {
    key: topic.key,
    parentKey: topic.parentKey,
    title: topic.title,
    tier: topic.tier,
    position: topic.position,
    sources: topic.sources,
  };
}

export function presentHandoff(handoff: Handoff) {
  return {
    summary: handoff.summary,
    nextStep: handoff.nextStep,
    openQuestions: handoff.openQuestions,
    createdAt: handoff.createdAt.toISOString(),
  };
}
