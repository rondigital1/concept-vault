import { execSync } from 'node:child_process';
import { getDocumentTitleIssue } from '@/app/library/documentPresentation';
import { getAllDocumentsForLibrary } from '@/server/services/document.service';
import { IngestWorkspace, type IngestWorkspaceDocument, type IngestWorkspaceStats } from './IngestWorkspace';

function getCurrentUserName(): string {
  try {
    const value = execSync('git config user.name', { encoding: 'utf8' }).trim();
    if (value) {
      return value;
    }
  } catch {
    // Fall through to process-level defaults.
  }

  const candidates = [
    process.env.GIT_AUTHOR_NAME,
    process.env.GIT_COMMITTER_NAME,
    process.env.USER,
    process.env.USERNAME,
  ];

  return candidates.find((candidate) => candidate && candidate.trim())?.trim() ?? 'User';
}

export default async function IngestPage() {
  let recentDocuments: IngestWorkspaceDocument[] = [];
  let stats: IngestWorkspaceStats = {
    totalRecords: 0,
    directImports: 0,
    researchImports: 0,
    favorites: 0,
    cleanupCandidates: 0,
  };

  try {
    const documents = await getAllDocumentsForLibrary();

    stats = {
      totalRecords: documents.length,
      directImports: documents.filter((document) => !document.is_webscout_discovered).length,
      researchImports: documents.filter((document) => document.is_webscout_discovered).length,
      favorites: documents.filter((document) => document.is_favorite).length,
      cleanupCandidates: documents.filter((document) => Boolean(getDocumentTitleIssue(document.title))).length,
    };

    recentDocuments = documents.slice(0, 4).map((document) => ({
      id: document.id,
      title: document.title,
      source: document.source,
      imported_at: document.imported_at,
      is_webscout_discovered: document.is_webscout_discovered,
    }));
  } catch {
    // Render the ingest UI even if the library query is unavailable.
  }

  return <IngestWorkspace recentDocuments={recentDocuments} stats={stats} userName={getCurrentUserName()} />;
}
