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

const optionalString = (field: string) =>
  z.string({ invalid_type_error: `${field} must be a string` }).optional();

const optionalNonEmptyString = (field: string) =>
  z.string({ invalid_type_error: `${field} must be a string` }).trim().min(1, `${field} is required`);

const optionalFiniteNumber = (field: string) =>
  z
    .number({ invalid_type_error: `${field} must be a number` })
    .refine(Number.isFinite, `${field} must be a finite number`)
    .optional();

const optionalBoolean = (field: string) =>
  z.boolean({ invalid_type_error: `${field} must be a boolean` }).optional();

const optionalStringArray = (field: string) =>
  z.array(z.string({ invalid_type_error: `${field} entries must be strings` }), {
    invalid_type_error: `${field} must be an array`,
  }).optional();

export const clientRouteErrorSchema = z.object({
  boundary: z.enum(['segment', 'global'], {
    errorMap: () => ({ message: 'boundary must be segment or global' }),
  }),
  pathname: z
    .string({ invalid_type_error: 'pathname must be a string' })
    .min(1, 'pathname is required')
    .max(512, 'pathname must be at most 512 characters'),
  message: z
    .string({ invalid_type_error: 'message must be a string' })
    .min(1, 'message is required')
    .max(500, 'message must be at most 500 characters'),
  digest: z
    .string({ invalid_type_error: 'digest must be a string' })
    .max(120, 'digest must be at most 120 characters')
    .nullable(),
  timestamp: z
    .string({ invalid_type_error: 'timestamp must be a string' })
    .min(1, 'timestamp is required')
    .max(128, 'timestamp must be at most 128 characters'),
  userAgent: z
    .string({ invalid_type_error: 'userAgent must be a string' })
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
    errorMap: () => ({ message: 'cadence must be daily or weekly' }),
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
    errorMap: () => ({ message: 'cadence must be daily or weekly' }),
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
    errorMap: () => ({ message: 'runMode is invalid' }),
  }).optional(),
  trigger: z.enum(PIPELINE_TRIGGERS, {
    errorMap: () => ({ message: 'trigger is invalid' }),
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
    errorMap: () => ({ message: 'scope must be topic or all_topics' }),
  }).optional(),
  maxTopics: optionalFiniteNumber('maxTopics'),
});

export const refreshTopicRequestSchema = z.object({
  day: optionalString('day'),
  topicId: optionalNonEmptyString('topicId'),
  mode: z.enum(REFRESH_TOPIC_MODES, {
    errorMap: () => ({ message: 'mode is invalid' }),
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
      errorMap: () => ({ message: 'origin.feature must be llm:chat' }),
    }),
    runId: optionalString('origin.runId'),
    messageId: optionalString('origin.messageId'),
  }),
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
    errorMap: () => ({ message: 'runMode is invalid' }),
  }).optional(),
  maxTopics: optionalFiniteNumber('maxTopics'),
});

export const agentProfileKeySchema = z.enum(AGENT_KEYS, {
  errorMap: () => ({ message: 'Unknown agent profile' }),
});
