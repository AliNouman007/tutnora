import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { TEXT_LIMITS } from '../../domain/limits';
import { EVIDENCE_KINDS, EVIDENCE_RESULTS, EVIDENCE_SUPPORTS } from '../../domain/types';
import { recordEvidence } from '../../services/evidence';
import type { ToolContext } from '../context';
import { runTool } from '../results';

const inputSchema = z.strictObject({
  goalId: z.string().min(1).max(TEXT_LIMITS.id),
  topicKey: z.string().min(1).max(TEXT_LIMITS.topicKey),
  kind: z
    .enum(EVIDENCE_KINDS)
    .describe(
      'What the learner did: explain, predict_output, debug, build, interview_answer, or recall',
    ),
  support: z
    .enum(EVIDENCE_SUPPORTS)
    .describe(
      'Help received: independent (none), hinted (needed hints), ai_assisted (used AI to produce the answer), solution_shown (was shown the solution)',
    ),
  result: z.enum(EVIDENCE_RESULTS),
  note: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.evidenceNote)
    .nullable()
    .optional()
    .describe('Short assessor note: what was right or wrong'),
  requestId: z
    .string()
    .min(1)
    .max(TEXT_LIMITS.id)
    .nullable()
    .optional()
    .describe('A unique id for this answer. Send the same id if you retry the call.'),
});

export function registerRecordEvidence(server: McpServer, context: ToolContext): void {
  server.registerTool(
    'record_evidence',
    {
      description:
        "Records the result of one assessment of one topic, after the learner answers. Returns the topic's new status and next review date, calculated by Tutnora. Never mark a topic as learned yourself; record evidence and use the status Tutnora returns.",
      inputSchema,
    },
    (input) =>
      runTool('record_evidence', async () => {
        const result = await recordEvidence(
          context.db,
          context.identity.learnerId,
          {
            goalId: input.goalId,
            topicKey: input.topicKey,
            kind: input.kind,
            support: input.support,
            result: input.result,
            note: input.note ?? null,
            requestId: input.requestId ?? null,
          },
          context.now(),
        );
        return {
          topicKey: result.topicKey,
          status: result.progress.status,
          nextReviewAt: result.progress.nextReviewAt?.toISOString() ?? null,
          independentStreak: result.progress.independentStreak,
          duplicate: result.duplicate,
        };
      }),
  );
}
