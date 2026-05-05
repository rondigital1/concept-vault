import { sql } from '@/db';
import { createHash } from 'node:crypto';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import { pipelineFlow, type PipelineInput } from '@/server/flows/pipeline.flow';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export type IngestDocumentResult = {
  documentId: string;
  created: boolean;
  enrichmentJobId: string | null;
  enrichmentQueued: boolean;
  enrichmentRunId: string | null;
};

export async function ingestDocument({
  workspaceId,
  title,
  source,
  content,
  autoEnrich = process.env.NODE_ENV !== 'test',
  enableAutoDistill,
}: {
  workspaceId: string;
  title: string;
  source: string;
  content: string;
  autoEnrich?: boolean;
  enableAutoDistill?: boolean;
}): Promise<IngestDocumentResult> {
  const normalizedContent = normalizeContent(content);
  // 2. Compute a stable content_hash
  const contentHash = sha256(normalizedContent);

  // 4. Insert new document with conflict handling
  const inserted = await sql<Array<{ id: string }>>`
    INSERT INTO documents (workspace_id, title, source, content, content_hash)
    VALUES (${workspaceId}, ${title}, ${source}, ${normalizedContent}, ${contentHash})
    ON CONFLICT (workspace_id, content_hash) DO NOTHING
    RETURNING id
  `;
  if (inserted.length === 0) {
    // If nothing was inserted, it means a conflict occurred (deduplicated)
    const existing = await sql<Array<{ id: string }>>`
      SELECT id
      FROM documents
      WHERE workspace_id = ${workspaceId}
        AND content_hash = ${contentHash}
      LIMIT 1
    `;
    const documentId = existing[0]?.id ?? 'unknown';
    console.log(`[Ingest] Deduplicated document: ${title} (${documentId})`);
    return {
      documentId,
      created: false,
      enrichmentJobId: null,
      enrichmentQueued: false,
      enrichmentRunId: null,
    };
  }
  const documentId = inserted[0].id;
  console.log(`[Ingest] Inserted document: ${title} (${documentId})`);
  console.log(`[Ingest] Created document: ${title} (${documentId})`);

  let enrichmentRunId: string | null = null;
  if (autoEnrich) {
    try {
      const resolvedEnableAutoDistill =
        typeof enableAutoDistill === 'boolean'
          ? enableAutoDistill
          : (await getAgentProfileSettingsMap()).pipeline.enableAutoDistillOnIngest;
      const enrichmentInput: PipelineInput = {
        workspaceId,
        trigger: 'auto_document',
        runMode: 'lightweight_enrichment',
        documentIds: [documentId],
        limit: 1,
        enableCategorization: true,
        enableAutoDistill: resolvedEnableAutoDistill,
        idempotencyKey: `auto_enrich:${documentId}`,
      };

      const enrichmentResult = await pipelineFlow(enrichmentInput);
      enrichmentRunId = enrichmentResult.runId;
    } catch (error) {
      // Ingest should succeed even if auto-enrichment fails.
      console.error('[Ingest] Auto enrichment failed:', error);
    }
  }

  return {
    documentId,
    created: true,
    enrichmentJobId: null,
    enrichmentQueued: false,
    enrichmentRunId,
  };
}

function normalizeContent(content: string): string {
  // 1. Trim leading/trailing whitespace
  // 2. Normalize newlines (\r\n → \n)
  let normalized = content.trim().replace(/\r\n/g, '\n');

  // 3. Collapse repeated blank lines (e.g., 5 blank lines → 2)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 4. Remove trailing spaces on each line
  normalized = normalized.split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n');

  // 5. Normalize weird unicode spaces (NBSP → space)
  normalized = normalized.replace(/\u00A0/g, ' '); // Non-breaking space

  return normalized;
}
