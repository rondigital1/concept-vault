import {
  countTopicLinkedDocuments,
  SavedTopicRow,
  listSavedTopics,
  countTopicSignalsSince,
  getSavedTopicsByIds,
  getTopicDocuments,
  getTopicLinkedDocuments,
  linkTopicToMatchingDocuments,
  upsertTopicSetup,
} from '@/server/repos/savedTopics.repo';
import { getLatestReportForTopic } from '@/server/repos/report.repo';
import { GOAL_STOP_WORDS } from '@/server/ai/tools/scoring.utils';

export type ScheduledRunMode = 'full_report' | 'incremental_update' | 'concept_only' | 'skip';

export interface TopicSetupResult {
  topicId: string;
  focusTags: string[];
  linkedDocumentIds: string[];
  linkedCount: number;
  previewGoal: string;
}

export interface RunModeDecision {
  mode: ScheduledRunMode;
  reason: string;
  signalCount: number;
  linkedDocs: number;
  lastRunAt: string | null;
  lastReportAt: string | null;
}

export interface ReportReadyTopic {
  topic: SavedTopicRow;
  linkedDocumentCount: number;
  lastReportAt: string | null;
}

export interface TopicNeedingSources {
  topic: SavedTopicRow;
  linkedDocumentCount: number;
  lastReportAt: string | null;
}

export const MIN_LINKED_DOCUMENTS_FOR_REPORT = 3;

function normalizeTag(tag: string): string | null {
  const clean = tag.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!clean || clean.length < 2 || clean.length > 40) {
    return null;
  }
  return clean;
}

function uniqueTags(tags: string[], max = 20): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const clean = normalizeTag(tag);
    if (!clean || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    normalized.push(clean);
    if (normalized.length >= max) {
      break;
    }
  }

  return normalized;
}

function deriveTagsFromGoal(goal: string): string[] {
  const words = goal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !GOAL_STOP_WORDS.has(word));

  const unigram = words.slice(0, 12);
  const bigram: string[] = [];

  for (let i = 0; i < words.length - 1; i += 1) {
    const a = words[i];
    const b = words[i + 1];
    if (GOAL_STOP_WORDS.has(a) || GOAL_STOP_WORDS.has(b)) {
      continue;
    }
    bigram.push(`${a} ${b}`);
    if (bigram.length >= 6) {
      break;
    }
  }

  return uniqueTags([...bigram, ...unigram], 12);
}

function summarizeTagFrequencies(tags: string[]): string[] {
  const counts = new Map<string, number>();
  for (const tag of tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 10);
}

function hoursSince(iso: string | null): number | null {
  if (!iso) {
    return null;
  }

  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    return null;
  }

  return (Date.now() - ts) / (1000 * 60 * 60);
}

export async function setupTopicContext(topicId: string): Promise<TopicSetupResult> {
  const topics = await getSavedTopicsByIds([topicId]);
  const topic = topics[0];
  if (!topic) {
    throw new Error(`Topic ${topicId} not found`);
  }

  const goalTags = deriveTagsFromGoal(topic.goal);
  const baselineFocusTags = uniqueTags([...(topic.focus_tags ?? []), ...goalTags], 20);

  const matchingDocs = await getTopicDocuments(baselineFocusTags, Math.max(topic.max_docs_per_run, 20));
  const inferredDocTags = summarizeTagFrequencies(matchingDocs.flatMap((doc) => doc.tags ?? []));
  const nextFocusTags = uniqueTags([...baselineFocusTags, ...inferredDocTags], 20);

  const linked = await linkTopicToMatchingDocuments(topic.id, nextFocusTags, 250);

  const previewGoal =
    nextFocusTags.length > 0
      ? `Track updates related to: ${nextFocusTags.slice(0, 6).join(', ')}`
      : topic.goal;

  await upsertTopicSetup({
    topicId: topic.id,
    focusTags: nextFocusTags,
    metadata: {
      previewGoal,
      seedTags: goalTags,
      linkedDocumentCount: linked.linkedCount,
      setupAt: new Date().toISOString(),
    },
  });

  return {
    topicId: topic.id,
    focusTags: nextFocusTags,
    linkedDocumentIds: linked.documentIds,
    linkedCount: linked.linkedCount,
    previewGoal,
  };
}

export async function decideScheduledRunMode(topic: SavedTopicRow): Promise<RunModeDecision> {
  const signalCount = await countTopicSignalsSince(topic.id, topic.last_run_at);
  const linkedDocs = (await getTopicLinkedDocuments(topic.id, 200)).length;
  const latestReport = await getLatestReportForTopic(topic.id);

  const lastReportAt = latestReport?.created_at ?? null;
  const hoursSinceReport = hoursSince(lastReportAt);

  if (signalCount === 0 && hoursSinceReport !== null && hoursSinceReport < 24) {
    return {
      mode: 'skip',
      reason: 'No new linked signal and a recent report already exists',
      signalCount,
      linkedDocs,
      lastRunAt: topic.last_run_at,
      lastReportAt,
    };
  }

  if (signalCount >= 3) {
    return {
      mode: 'full_report',
      reason: 'Strong novelty signal from linked topic documents',
      signalCount,
      linkedDocs,
      lastRunAt: topic.last_run_at,
      lastReportAt,
    };
  }

  if (signalCount >= 1) {
    return {
      mode: 'incremental_update',
      reason: 'Some new signal detected; incremental refresh is sufficient',
      signalCount,
      linkedDocs,
      lastRunAt: topic.last_run_at,
      lastReportAt,
    };
  }

  if (!latestReport && linkedDocs > 0) {
    return {
      mode: 'concept_only',
      reason: 'No prior report exists; refresh concepts first',
      signalCount,
      linkedDocs,
      lastRunAt: topic.last_run_at,
      lastReportAt,
    };
  }

  if (hoursSinceReport !== null && hoursSinceReport >= 24 * 7 && linkedDocs > 0) {
    return {
      mode: 'incremental_update',
      reason: 'Report is stale, but novelty is low',
      signalCount,
      linkedDocs,
      lastRunAt: topic.last_run_at,
      lastReportAt,
    };
  }

  return {
    mode: 'skip',
    reason: 'No meaningful new signal',
    signalCount,
    linkedDocs,
    lastRunAt: topic.last_run_at,
    lastReportAt,
  };
}

export async function listReportReadyTopics(
  minLinkedDocuments = MIN_LINKED_DOCUMENTS_FOR_REPORT,
): Promise<ReportReadyTopic[]> {
  const minimum = Math.max(1, Math.floor(minLinkedDocuments));
  const topics = await listSavedTopics({ activeOnly: true });

  const evaluated = await Promise.all(
    topics.map(async (topic) => {
      const [linkedDocumentCount, latestReport] = await Promise.all([
        countTopicLinkedDocuments(topic.id),
        getLatestReportForTopic(topic.id),
      ]);

      if (linkedDocumentCount < minimum) {
        return null;
      }

      return {
        topic,
        linkedDocumentCount,
        lastReportAt: latestReport?.created_at ?? null,
      } satisfies ReportReadyTopic;
    }),
  );

  return evaluated
    .filter((entry): entry is ReportReadyTopic => entry !== null)
    .sort((a, b) => {
      if (b.linkedDocumentCount !== a.linkedDocumentCount) {
        return b.linkedDocumentCount - a.linkedDocumentCount;
      }

      return b.topic.updated_at.localeCompare(a.topic.updated_at);
    });
}

export async function listTopicsNeedingSources(
  minLinkedDocuments = MIN_LINKED_DOCUMENTS_FOR_REPORT,
): Promise<TopicNeedingSources[]> {
  const minimum = Math.max(1, Math.floor(minLinkedDocuments));
  const topics = await listSavedTopics({ activeOnly: true });

  const evaluated = await Promise.all(
    topics.map(async (topic) => {
      const [linkedDocumentCount, latestReport] = await Promise.all([
        countTopicLinkedDocuments(topic.id),
        getLatestReportForTopic(topic.id),
      ]);

      if (linkedDocumentCount >= minimum) {
        return null;
      }

      return {
        topic,
        linkedDocumentCount,
        lastReportAt: latestReport?.created_at ?? null,
      } satisfies TopicNeedingSources;
    }),
  );

  return evaluated.filter((entry): entry is TopicNeedingSources => entry !== null);
}
