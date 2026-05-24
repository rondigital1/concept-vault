import { z } from 'zod';
import { AGENT_KEYS } from '@/server/agents/configuration';

const PIPELINE_RUN_MODES = [
  'full_report',
  'incremental_update',
  'concept_only',
  'scout_only',
  'lightweight_enrichment',
  'topic_setup',
  'skip',
] as const;

const PIPELINE_TRIGGERS = ['manual', 'auto_document', 'auto_topic', 'scheduler', 'cron'] as const;
const TOPIC_CADENCE = ['daily', 'weekly'] as const;
const REFRESH_TOPIC_MODES = [
  'full_report',
  'incremental_update',
  'concept_only',
  'scout_only',
] as const;

const requiredStringError = (field: string) => (issue: { input: unknown }) =>
  issue.input === undefined ? 'Required' : `${field} must be a string`;

const optionalString = (field: string) => z.string({ error: requiredStringError(field) }).optional();

const optionalNonEmptyString = (field: string) =>
  z.string({ error: requiredStringError(field) }).trim().min(1, `${field} is required`);

const optionalFiniteNumber = (field: string) =>
  z
    .number({ error: () => `${field} must be a number` })
    .refine(Number.isFinite, `${field} must be a finite number`)
    .optional();

const optionalBoolean = (field: string) =>
  z.boolean({ error: () => `${field} must be a boolean` }).optional();

const optionalStringArray = (field: string) =>
  z
    .array(z.string({ error: () => `${field} entries must be strings` }), {
      error: () => `${field} must be an array`,
    })
    .optional();

export const clientRouteErrorSchema = z.object({
  boundary: z.enum(['segment', 'global'], {
    error: () => 'boundary must be segment or global',
  }),
  pathname: z
    .string({ error: () => 'pathname must be a string' })
    .min(1, 'pathname is required')
    .max(512, 'pathname must be at most 512 characters'),
  message: z
    .string({ error: requiredStringError('message') })
    .min(1, 'message is required')
    .max(500, 'message must be at most 500 characters'),
  digest: z
    .string({ error: () => 'digest must be a string' })
    .max(120, 'digest must be at most 120 characters')
    .nullable(),
  timestamp: z
    .string({ error: requiredStringError('timestamp') })
    .min(1, 'timestamp is required')
    .max(128, 'timestamp must be at most 128 characters'),
  userAgent: z
    .string({ error: () => 'userAgent must be a string' })
    .max(512, 'userAgent must be at most 512 characters')
    .nullable(),
});

export const createTopicRequestSchema = z.object({
  name: optionalNonEmptyString('name'),
  goal: optionalNonEmptyString('goal'),
  focusTags: optionalStringArray('focusTags'),
  maxDocsPerRun: optionalFiniteNumber('maxDocsPerRun'),
  minQualityResults: optionalFiniteNumber('minQualityResults'),
  minRelevanceScore: optionalFiniteNumber('minRelevanceScore'),
  maxIterations: optionalFiniteNumber('maxIterations'),
  maxQueries: optionalFiniteNumber('maxQueries'),
  isActive: optionalBoolean('isActive'),
  isTracked: optionalBoolean('isTracked'),
  cadence: z.enum(TOPIC_CADENCE, {
    error: () => 'cadence must be daily or weekly',
  }).optional(),
  defaultRunMode: optionalString('defaultRunMode'),
  enableCategorizationByDefault: optionalBoolean('enableCategorizationByDefault'),
  skipPublishByDefault: optionalBoolean('skipPublishByDefault'),
});

export const updateTopicRequestSchema = z.object({
  name: optionalString('name'),
  goal: optionalString('goal'),
  focusTags: optionalStringArray('focusTags'),
  maxDocsPerRun: optionalFiniteNumber('maxDocsPerRun'),
  minQualityResults: optionalFiniteNumber('minQualityResults'),
  minRelevanceScore: optionalFiniteNumber('minRelevanceScore'),
  maxIterations: optionalFiniteNumber('maxIterations'),
  maxQueries: optionalFiniteNumber('maxQueries'),
  isActive: optionalBoolean('isActive'),
  isTracked: optionalBoolean('isTracked'),
  cadence: z.enum(TOPIC_CADENCE, {
    error: () => 'cadence must be daily or weekly',
  }).optional(),
  defaultRunMode: optionalString('defaultRunMode'),
  enableCategorizationByDefault: optionalBoolean('enableCategorizationByDefault'),
  skipPublishByDefault: optionalBoolean('skipPublishByDefault'),
});

export const sourceWatchCreateRequestSchema = z.object({
  url: optionalNonEmptyString('url'),
  label: optionalString('label'),
  kind: optionalString('kind'),
  isActive: optionalBoolean('isActive'),
  checkIntervalHours: optionalFiniteNumber('checkIntervalHours'),
});

export const sourceWatchUpdateRequestSchema = z.object({
  url: optionalString('url'),
  label: optionalString('label'),
  kind: optionalString('kind'),
  isActive: optionalBoolean('isActive'),
  checkIntervalHours: optionalFiniteNumber('checkIntervalHours'),
});

export const pipelineRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalString('topicId'),
  documentIds: optionalStringArray('documentIds'),
  limit: optionalFiniteNumber('limit'),
  goal: optionalString('goal'),
  enableCategorization: optionalBoolean('enableCategorization'),
  minQualityResults: optionalFiniteNumber('minQualityResults'),
  minRelevanceScore: optionalFiniteNumber('minRelevanceScore'),
  maxIterations: optionalFiniteNumber('maxIterations'),
  maxQueries: optionalFiniteNumber('maxQueries'),
  runMode: z.enum(PIPELINE_RUN_MODES, {
    error: () => 'runMode is invalid',
  }).optional(),
  trigger: z.enum(PIPELINE_TRIGGERS, {
    error: () => 'trigger is invalid',
  }).optional(),
  idempotencyKey: optionalString('idempotencyKey'),
  enableAutoDistill: optionalBoolean('enableAutoDistill'),
  skipPublish: optionalBoolean('skipPublish'),
});

export const generateReportRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalString('topicId'),
  documentIds: optionalStringArray('documentIds'),
  goal: optionalString('goal'),
  limit: optionalFiniteNumber('limit'),
});

export const refreshConceptsRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalString('topicId'),
  documentIds: optionalStringArray('documentIds'),
  limit: optionalFiniteNumber('limit'),
});

export const findSourcesRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalString('topicId'),
  goal: optionalString('goal'),
  minQualityResults: optionalFiniteNumber('minQualityResults'),
  minRelevanceScore: optionalFiniteNumber('minRelevanceScore'),
  maxIterations: optionalFiniteNumber('maxIterations'),
  maxQueries: optionalFiniteNumber('maxQueries'),
  scope: z.enum(['topic', 'all_topics'], {
    error: () => 'scope must be topic or all_topics',
  }).optional(),
  maxTopics: optionalFiniteNumber('maxTopics'),
});

export const refreshTopicRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalNonEmptyString('topicId'),
  mode: z.enum(REFRESH_TOPIC_MODES, {
    error: () => 'mode is invalid',
  }).optional(),
});

export const ingestRequestSchema = z.object({
  title: optionalString('title'),
  source: optionalString('source'),
  content: optionalString('content'),
});

export const llmIngestRequestSchema = z.object({
  title: optionalString('title'),
  content: optionalNonEmptyString('content'),
  origin: z.object({
    feature: z.literal('llm:chat', {
      error: () => 'origin.feature must be llm:chat',
    }),
    runId: optionalString('origin.runId'),
    messageId: optionalString('origin.messageId'),
  }),
});

const chatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant'], {
    error: () => 'history role must be user or assistant',
  }),
  content: z.string({ error: () => 'history content must be a string' }),
}).catchall(z.unknown());

export const chatRequestSchema = z.object({
  message: z
    .string({ error: () => 'message must be a string' })
    .trim()
    .min(1, 'Message is required'),
  history: z
    .array(chatHistoryMessageSchema, {
      error: () => 'history must be an array',
    })
    .optional()
    .default([]),
});

export const agentProfilePatchRequestSchema = z.object({}).catchall(z.unknown());

export const cronPipelineRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalString('topicId'),
  limit: optionalFiniteNumber('limit'),
  goal: optionalString('goal'),
  enableCategorization: optionalBoolean('enableCategorization'),
  minQualityResults: optionalFiniteNumber('minQualityResults'),
  minRelevanceScore: optionalFiniteNumber('minRelevanceScore'),
  maxIterations: optionalFiniteNumber('maxIterations'),
  maxQueries: optionalFiniteNumber('maxQueries'),
  runMode: z.enum(PIPELINE_RUN_MODES, {
    error: () => 'runMode is invalid',
  }).optional(),
  maxTopics: optionalFiniteNumber('maxTopics'),
});

export const agentProfileKeySchema = z.enum(AGENT_KEYS, {
  error: () => 'Unknown agent profile',
});
