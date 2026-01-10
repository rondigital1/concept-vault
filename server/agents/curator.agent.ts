import { RunStep } from '@/server/observability/runTrace.types';
import {
  categorize,
  extractTags,
  findRelatedDocs,
  getDocument,
  setDocumentTags,
} from '../services/document.service';

export interface CuratorInput {
  documentId: string;
  /**
   * Optional: enable categorization (LLM call) once you’re ready.
   * Default: false for MVP simplicity.
   */
  enableCategorization?: boolean;
}

export interface CuratorOutput {
  tags: string[];
  category: string;
  relatedDocs: string[];
}

type StepStatus = 'running' | 'ok' | 'error' | 'skipped';

function nowIso() {
  return new Date().toISOString();
}

function emit(onStep: ((step: RunStep) => void) | undefined, step: any) {
  if (!onStep) return;
  onStep(step as RunStep);
}

/**
 * Curator Agent (MVP)
 *
 * Responsibilities:
 * - Load a document
 * - Extract stable tags (LLM + deterministic cleanup happens inside extractTags)
 * - Optionally categorize (off by default)
 * - Find related documents deterministically (tag overlap)
 * - Persist tags back to the document ("update knowledge graph")
 */
export async function curatorAgent(
  input: CuratorInput,
  onStep?: (step: RunStep) => void
): Promise<CuratorOutput> {
  const enableCategorization = input.enableCategorization ?? false;

  // Step 1: Load document
  emit(onStep, {
    name: 'load_document',
    status: 'running' as StepStatus,
    startedAt: nowIso(),
    input: { documentId: input.documentId },
  });

  const document = await getDocument(input.documentId);
  if (!document) {
    emit(onStep, {
      name: 'load_document',
      status: 'error' as StepStatus,
      startedAt: nowIso(),
      endedAt: nowIso(),
      error: { message: `Document ${input.documentId} not found` },
    });
    throw new Error(`Document ${input.documentId} not found`);
  }

  emit(onStep, {
    name: 'load_document',
    status: 'ok' as StepStatus,
    startedAt: nowIso(),
    endedAt: nowIso(),
    output: { id: document.id, title: document.title, source: document.source },
  });

  // Step 2: Extract tags
  emit(onStep, {
    name: 'extract_tags',
    status: 'running' as StepStatus,
    startedAt: nowIso(),
    input: { chars: document.content.length },
  });

  let tags: string[] = [];
  try {
    tags = await extractTags(document.content);
    emit(onStep, {
      name: 'extract_tags',
      status: 'ok' as StepStatus,
      startedAt: nowIso(),
      endedAt: nowIso(),
      output: { tagCount: tags.length, tags },
    });
  } catch (e: any) {
    emit(onStep, {
      name: 'extract_tags',
      status: 'error' as StepStatus,
      startedAt: nowIso(),
      endedAt: nowIso(),
      error: { message: e?.message ?? String(e) },
    });
    throw e;
  }

  // Step 3: Categorize (optional)
  let category = 'uncategorized';
  if (enableCategorization) {
    emit(onStep, {
      name: 'categorize',
      status: 'running' as StepStatus,
      startedAt: nowIso(),
      input: { tagCount: tags.length },
    });

    try {
      category = await categorize(tags);
      emit(onStep, {
        name: 'categorize',
        status: 'ok' as StepStatus,
        startedAt: nowIso(),
        endedAt: nowIso(),
        output: { category },
      });
    } catch (e: any) {
      // Keep the pipeline resilient: categorization is non-critical.
      emit(onStep, {
        name: 'categorize',
        status: 'error' as StepStatus,
        startedAt: nowIso(),
        endedAt: nowIso(),
        error: { message: e?.message ?? String(e), nonCritical: true },
      });
      category = 'uncategorized';
    }
  } else {
    emit(onStep, {
      name: 'categorize',
      status: 'skipped' as StepStatus,
      startedAt: nowIso(),
      endedAt: nowIso(),
      output: { reason: 'enableCategorization=false' },
    });
  }

  // Step 4: Find related docs (deterministic)
  emit(onStep, {
    name: 'find_related_docs',
    status: 'running' as StepStatus,
    startedAt: nowIso(),
    input: { tagCount: tags.length },
  });

  const relatedDocs = await findRelatedDocs(document.id);

  emit(onStep, {
    name: 'find_related_docs',
    status: 'ok' as StepStatus,
    startedAt: nowIso(),
    endedAt: nowIso(),
    output: { relatedCount: relatedDocs.length, relatedDocs },
  });

  // Step 5: Update knowledge graph (MVP)
  // For MVP, this simply persists tags on the document row.
  emit(onStep, {
    name: 'persist_tags',
    status: 'running' as StepStatus,
    startedAt: nowIso(),
    input: { tagCount: tags.length },
  });

  await setDocumentTags(document.id, tags);

  emit(onStep, {
    name: 'persist_tags',
    status: 'ok' as StepStatus,
    startedAt: nowIso(),
    endedAt: nowIso(),
    output: { saved: true },
  });

  return {
    tags,
    category,
    relatedDocs,
  };
}
