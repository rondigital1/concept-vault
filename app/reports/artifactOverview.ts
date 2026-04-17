import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import { extractReportCitations, type ReportCitation } from './reportsViewModel';

type ArtifactOverviewLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type ArtifactOverview = {
  description: string;
  summaryTitle: string;
  summaryCopy: string;
  stats: Array<{ label: string; value: string }>;
  topics: string[];
  reasoning: string[];
  evidence: string[];
  citations: ReportCitation[];
  sourceUrl: string | null;
  sourceDocumentId: string | null;
  primaryLink: ArtifactOverviewLink | null;
  secondaryLink: ArtifactOverviewLink | null;
  statusNotice: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

function readSourceDocumentId(sourceRefs: unknown): string | null {
  const record = asObject(sourceRefs);
  if (!record) {
    return null;
  }

  return readString(record.documentId) ?? readString(record.document_id);
}

function buildSummaryPreview(markdown: string | null): string | null {
  if (!markdown) {
    return null;
  }

  const preview = markdown.replace(/\s+/g, ' ').trim().slice(0, 360);
  return preview || null;
}

export function readArtifactOverview(artifact: ArtifactRow): ArtifactOverview {
  const content = asObject(artifact.content) ?? {};
  const sourceRefs = asObject(artifact.source_refs) ?? {};
  const summary = readString(content.summary);
  const topics = readStringArray(content.topics).slice(0, 8);
  const reasoning = readStringArray(content.reasoning).slice(0, 5);
  const evidence = readStringArray(content.evidence).slice(0, 4);
  const sourceUrl = readString(content.url);
  const sourceDocumentId = readSourceDocumentId(sourceRefs);

  if (artifact.kind === 'research-report') {
    const executiveSummary = readString(content.executiveSummary);
    const markdown = readString(content.markdown);
    const markdownPreview = buildSummaryPreview(markdown);
    const topicsCovered = readStringArray(content.topicsCovered).slice(0, 8);
    const sourcesCount = readNumber(content.sourcesCount);

    return {
      description: 'This artifact is the preserved report payload. The canonical reading experience lives on the report route, but the artifact inspector keeps the same output tied to its workflow record.',
      summaryTitle: 'Report overview',
      summaryCopy:
        executiveSummary ??
        markdownPreview ??
        'No executive summary was saved with this report artifact, but the technical payload remains available below.',
      stats: [
        { label: 'Sources used', value: typeof sourcesCount === 'number' ? `${sourcesCount}` : '—' },
        { label: 'Topics covered', value: topicsCovered.length > 0 ? `${topicsCovered.length}` : '—' },
      ],
      topics: topicsCovered,
      reasoning: [],
      evidence: [],
      citations: markdown ? extractReportCitations(markdown) : [],
      sourceUrl: null,
      sourceDocumentId: null,
      primaryLink: { href: `/reports/${artifact.id}`, label: 'Open report' },
      secondaryLink: { href: '/reports', label: 'Open archive' },
      statusNotice: null,
    };
  }

  if (artifact.kind === 'web-proposal') {
    const relevanceScore = readNumber(content.relevanceScore);
    const contentType = readString(content.contentType);

    return {
      description: 'Review the proposed source here with the same editorial framing used by reports. The technical payload stays available below for auditability.',
      summaryTitle: 'Source candidate overview',
      summaryCopy: summary ?? 'No summary was saved for this source candidate.',
      stats: [
        { label: 'Relevance score', value: typeof relevanceScore === 'number' ? relevanceScore.toFixed(2) : '—' },
        { label: 'Source type', value: contentType ?? 'Unknown' },
      ],
      topics,
      reasoning,
      evidence: [],
      citations: [],
      sourceUrl,
      sourceDocumentId,
      primaryLink: sourceDocumentId
        ? { href: `/library/${sourceDocumentId}`, label: 'Open in Library' }
        : sourceUrl
          ? { href: sourceUrl, label: 'Open source', external: true }
          : null,
      secondaryLink: { href: '/today', label: 'Back to Research' },
      statusNotice:
        artifact.status === 'approved' && sourceDocumentId
          ? 'This source has already been added to Library.'
          : null,
    };
  }

  if (artifact.kind === 'concept') {
    const type = readString(content.type);
    const documentTitle = readString(content.documentTitle);

    return {
      description: 'Concept artifacts stay reviewable here with their supporting evidence and trace back to the originating document.',
      summaryTitle: 'Concept overview',
      summaryCopy: summary ?? 'No concept summary was saved for this item.',
      stats: [
        { label: 'Type', value: type ?? 'Concept' },
        { label: 'From document', value: documentTitle ?? 'Unknown document' },
      ],
      topics,
      reasoning: [],
      evidence,
      citations: [],
      sourceUrl: null,
      sourceDocumentId: null,
      primaryLink: null,
      secondaryLink: { href: '/today', label: 'Back to Research' },
      statusNotice: null,
    };
  }

  if (artifact.kind === 'flashcard') {
    const format = readString(content.format);
    const documentTitle = readString(content.documentTitle);
    const back = readString(content.back);

    return {
      description: 'Flashcards remain inspectable with the same results-surface framing, while the raw payload stays below for auditability.',
      summaryTitle: 'Flashcard overview',
      summaryCopy: back ?? 'No answer was saved for this flashcard.',
      stats: [
        { label: 'Format', value: format ?? 'Flashcard' },
        { label: 'From document', value: documentTitle ?? 'Unknown document' },
      ],
      topics,
      reasoning: [],
      evidence: [],
      citations: [],
      sourceUrl: null,
      sourceDocumentId: null,
      primaryLink: null,
      secondaryLink: { href: '/today', label: 'Back to Research' },
      statusNotice: null,
    };
  }

  return {
    description: 'This artifact does not have a specialized presentation yet, but the same results-system framing keeps the metadata and raw payload legible.',
    summaryTitle: 'Artifact overview',
    summaryCopy: summary ?? 'This item does not have a specialized summary view yet. Technical details remain available below.',
    stats: [],
    topics,
    reasoning,
    evidence,
    citations: [],
    sourceUrl,
    sourceDocumentId,
    primaryLink: null,
    secondaryLink: { href: '/today', label: 'Back to Research' },
    statusNotice: null,
  };
}
