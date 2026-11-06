/** Maximum lengths of stored text, in characters. Enforced at the tool boundary. */
export const TEXT_LIMITS = {
  id: 64,
  learnerLanguage: 50,
  goalTitle: 200,
  goalTargetLevel: 100,
  topicKey: 120,
  topicTitle: 200,
  sourceUrl: 2048,
  evidenceNote: 500,
  handoffSummary: 1000,
  handoffNextStep: 500,
  handoffOpenQuestions: 500,
} as const;

/** Maximum sizes of lists in a single tool call. */
export const COLLECTION_LIMITS = {
  topicsPerSave: 200,
  sourcesPerTopic: 10,
} as const;

/** Allowed ranges for learner preferences. The database enforces the same ranges. */
export const PREFERENCE_LIMITS = {
  hintLimit: { min: 0, max: 10 },
  sessionMinutes: { min: 5, max: 240 },
} as const;

/** Lowercase segments of letters and digits, with single hyphens, joined by dots. */
const TOPIC_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Whether a topic key is a valid dot path, for example `css.layout.position`. */
export function isValidTopicKey(key: string): boolean {
  return key.length <= TEXT_LIMITS.topicKey && TOPIC_KEY_PATTERN.test(key);
}
