import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { AppError } from '../../domain/errors';
import { PREFERENCE_LIMITS, TEXT_LIMITS } from '../../domain/limits';
import { updatePreferences } from '../../services/preferences';
import type { ToolContext } from '../context';
import { presentLearner } from '../present';
import { runTool } from '../results';

const inputSchema = z.strictObject({
  language: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.learnerLanguage)
    .optional()
    .describe('Teaching language, for example roman-urdu or english'),
  hintLimit: z
    .number()
    .int()
    .min(PREFERENCE_LIMITS.hintLimit.min)
    .max(PREFERENCE_LIMITS.hintLimit.max)
    .optional(),
  sessionMinutes: z
    .number()
    .int()
    .min(PREFERENCE_LIMITS.sessionMinutes.min)
    .max(PREFERENCE_LIMITS.sessionMinutes.max)
    .optional(),
});

export function registerUpdatePreferences(server: McpServer, context: ToolContext): void {
  server.registerTool(
    'update_preferences',
    {
      description:
        "Saves the learner's teaching preferences. Only the values you pass change. Use it during onboarding and whenever the learner asks to change language, hints, or session length.",
      inputSchema,
    },
    ({ language, hintLimit, sessionMinutes }) =>
      runTool('update_preferences', async () => {
        if (language === undefined && hintLimit === undefined && sessionMinutes === undefined) {
          throw new AppError('VALIDATION', 'Provide at least one preference to update.');
        }
        const learner = await updatePreferences(
          context.db,
          context.identity.learnerId,
          { language, hintLimit, sessionMinutes },
          context.now(),
        );
        return { learner: presentLearner(learner) };
      }),
  );
}
