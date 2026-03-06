import { z } from 'zod';
import { AI_TASKS, type AITaskType } from '@/server/ai/tasks';

export interface QualityGateFailure {
  code:
    | 'empty_output'
    | 'final_report_incomplete'
    | 'final_report_too_short'
    | 'schema_invalid'
    | 'summary_too_short';
  message: string;
  retryable: boolean;
}

export type QualityGateResult<T> =
  | { ok: true; value: T }
  | { failure: QualityGateFailure; ok: false };

function textIsEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function validateStructuredOutput<TSchema extends z.ZodType<unknown>>(
  schema: TSchema,
  value: unknown,
): QualityGateResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    return {
      ok: false,
      failure: {
        code: 'schema_invalid',
        message: parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
          .join('; '),
        retryable: false,
      },
    };
  }

  return { ok: true, value: parsed.data };
}

function validateFinalReport(text: string): QualityGateResult<string> {
  if (text.length < 500) {
    return {
      ok: false,
      failure: {
        code: 'final_report_too_short',
        message: 'Final report is too short to be credible.',
        retryable: false,
      },
    };
  }

  const sectionChecks = ['executive summary', 'key findings', 'sources'];
  const normalized = text.toLowerCase();
  const missingSections = sectionChecks.filter((section) => !normalized.includes(section));

  if (missingSections.length > 0) {
    return {
      ok: false,
      failure: {
        code: 'final_report_incomplete',
        message: `Final report is missing required sections: ${missingSections.join(', ')}`,
        retryable: false,
      },
    };
  }

  return { ok: true, value: text };
}

export function validateTextOutput(task: AITaskType, value: string): QualityGateResult<string> {
  const trimmed = value.trim();

  if (textIsEmpty(trimmed)) {
    return {
      ok: false,
      failure: {
        code: 'empty_output',
        message: 'Model returned empty text output.',
        retryable: true,
      },
    };
  }

  if (task === AI_TASKS.generateFinalReport || task === AI_TASKS.refineFinalReport) {
    return validateFinalReport(trimmed);
  }

  if (
    (task === AI_TASKS.summarizeSimple || task === AI_TASKS.generateReportDraft) &&
    trimmed.length < 120
  ) {
    return {
      ok: false,
      failure: {
        code: 'summary_too_short',
        message: 'Text output is too short to be useful.',
        retryable: false,
      },
    };
  }

  return { ok: true, value: trimmed };
}
