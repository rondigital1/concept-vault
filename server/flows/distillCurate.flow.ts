import { DistillerInput } from '@/server/agents/distiller.graph';
import { getDocumentsByIds, getDocumentsByTag, getRecentDocuments } from '@/server/repos/distiller.repo';
import { curateFlow } from '@/server/flows/curate.flow';
import { distillFlow } from '@/server/flows/distill.flow';

export interface DistillCurateInput {
  day?: string;
  documentIds?: string[];
  limit?: number;
  topicTag?: string;
  enableCategorization?: boolean;
}

export interface DistillCurateResult {
  distillRunId: string;
  curateRunIds: string[];
  curatedDocumentIds: string[];
  counts: {
    docsTargeted: number;
    docsCurated: number;
    docsCurateFailed: number;
    distill: {
      docsProcessed: number;
      conceptsProposed: number;
      flashcardsProposed: number;
    };
  };
  errors: Array<{
    documentId: string;
    message: string;
  }>;
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return 5;
  }
  return Math.max(1, Math.min(Math.floor(limit), 20));
}

async function resolveTargetDocumentIds(input: DistillCurateInput): Promise<string[]> {
  const limit = normalizeLimit(input.limit);

  if (input.documentIds && input.documentIds.length > 0) {
    const docs = await getDocumentsByIds(input.documentIds, limit);
    return docs.map((doc) => doc.id);
  }

  if (input.topicTag) {
    const docs = await getDocumentsByTag(input.topicTag, limit);
    return docs.map((doc) => doc.id);
  }

  const docs = await getRecentDocuments(limit);
  return docs.map((doc) => doc.id);
}

export async function distillCurateFlow(input: DistillCurateInput): Promise<DistillCurateResult> {
  const targetDocumentIds = await resolveTargetDocumentIds(input);
  const explicitDocumentIds = Array.isArray(input.documentIds) ? input.documentIds : [];
  const hasExplicitDocumentIds = explicitDocumentIds.length > 0;
  const distillDocumentIds = hasExplicitDocumentIds ? explicitDocumentIds : targetDocumentIds;

  const distillInput: DistillerInput = {
    day: input.day ?? todayISODate(),
    documentIds: distillDocumentIds.length > 0 ? distillDocumentIds : undefined,
    limit: normalizeLimit(input.limit),
    topicTag: input.topicTag,
  };

  const distillResult = await distillFlow(distillInput);

  const curateRunIds: string[] = [];
  const curatedDocumentIds: string[] = [];
  const errors: DistillCurateResult['errors'] = [];

  for (const documentId of targetDocumentIds) {
    try {
      const curateRunId = await curateFlow({
        documentId,
        enableCategorization: input.enableCategorization ?? false,
      });
      curateRunIds.push(curateRunId);
      curatedDocumentIds.push(documentId);
    } catch (error) {
      errors.push({
        documentId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    distillRunId: distillResult.runId,
    curateRunIds,
    curatedDocumentIds,
    counts: {
      docsTargeted: targetDocumentIds.length,
      docsCurated: curatedDocumentIds.length,
      docsCurateFailed: errors.length,
      distill: distillResult.output.counts,
    },
    errors,
  };
}
