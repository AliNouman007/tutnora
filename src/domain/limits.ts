/** Maximum lengths of stored text, in characters. Enforced at the tool boundary. */
export const TEXT_LIMITS = {
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

/** Lowercase segments of letters and digits, with single hyphens, joined by dots. */
const TOPIC_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Whether a topic key is a valid dot path, for example `css.layout.position`. */
export function isValidTopicKey(key: string): boolean {
  return key.length <= TEXT_LIMITS.topicKey && TOPIC_KEY_PATTERN.test(key);
}
