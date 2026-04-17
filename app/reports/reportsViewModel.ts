import type { ArtifactRow } from '@/server/repos/artifacts.repo';

export type ReportCitation = {
  title: string;
  url: string;
  source: string;
};

export type ReportCardSummary = {
  id: string;
  title: string;
  createdAt: string;
  day: string;
  executiveSummary: string | null;
  summaryLines: string[];
  summaryPreview: string | null;
  topicsCovered: string[];
  sourcesCount: number | null;
  isUnread: boolean;
  citations: ReportCitation[];
  runId: string | null;
  topicId: string | null;
};

export type ReportDetailModel = ReportCardSummary & {
  markdown: string;
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : [];
}

function extractSummaryLines(summary: string | null): string[] {
  if (!summary) {
    return [];
  }

  return summary
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function buildSummaryPreview(summaryLines: string[]): string | null {
  if (summaryLines.length === 0) {
    return null;
  }

  const joined = summaryLines.join(' ');
  return joined.length > 280 ? `${joined.slice(0, 277).trimEnd()}...` : joined;
}

function readCitationSource(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toUpperCase();
  } catch {
    return 'SOURCE';
  }
}

export function extractReportCitations(markdown: string): ReportCitation[] {
  const sourcesSection = markdown.match(/##\s+Sources\s*\n+([\s\S]*?)(?=\n##|\n#\s|$)/i)?.[1];
  if (!sourcesSection) {
    return [];
  }

  return sourcesSection
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/(?:^[-*]\s+|^\d+\.\s+)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      if (!match) {
        return null;
      }

      const [, title, url] = match;
      return {
        title: title.trim(),
        url,
        source: readCitationSource(url),
      } satisfies ReportCitation;
    })
    .filter((citation): citation is ReportCitation => citation !== null);
}

export function readReportSummary(report: ArtifactRow): ReportCardSummary {
  return readReportDetail(report);
}

export function readReportDetail(report: ArtifactRow): ReportDetailModel {
  const content = report.content as {
    title?: string;
    executiveSummary?: string;
    topicsCovered?: string[];
    sourcesCount?: number;
    markdown?: string;
  };

  const sourceRefs = report.source_refs as {
    topicId?: string;
  };

  const executiveSummary = readString(content.executiveSummary);
  const summaryLines = extractSummaryLines(executiveSummary);
  const markdown = readString(content.markdown) ?? '';

  return {
    id: report.id,
    title: readString(content.title) ?? report.title,
    createdAt: report.created_at,
    day: report.day,
    executiveSummary,
    summaryLines,
    summaryPreview: buildSummaryPreview(summaryLines),
    topicsCovered: readStringArray(content.topicsCovered),
    sourcesCount: typeof content.sourcesCount === 'number' ? content.sourcesCount : null,
    isUnread: !report.read_at,
    citations: extractReportCitations(markdown),
    runId: report.run_id,
    topicId: readString(sourceRefs.topicId),
    markdown,
  };
}

export function formatDisplayDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(dateString));
}

export function formatDisplayStamp(dateString: string): string {
  const date = new Date(dateString);

  const datePart = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
    .format(date)
    .replace(',', '')
    .replace(' ', ' ');

  return `${datePart.replaceAll('-', '.')} // ${timePart}`;
}

export function trimIdentifier(value: string | null, length = 14): string | null {
  if (!value) {
    return null;
  }

  return value.length <= length ? value : `${value.slice(0, length)}…`;
}
