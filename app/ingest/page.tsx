import { auth } from '@/auth';
import { getDocumentTitleIssue } from '@/app/library/documentPresentation';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getAllDocumentsForLibrary } from '@/server/services/document.service';
import { IngestWorkspace, type IngestWorkspaceDocument, type IngestWorkspaceStats } from './IngestWorkspace';

async function getCurrentUserName(): Promise<string> {
  const session = await auth().catch(() => null);
  const sessionName = session?.user?.name?.trim();
  if (sessionName) {
    return sessionName;
  }

  const candidates = [
    process.env.OWNER_EMAIL?.split('@')[0],
    process.env.GIT_AUTHOR_NAME,
    process.env.GIT_COMMITTER_NAME,
    process.env.USER,
    process.env.USERNAME,
  ];

  return candidates.find((candidate) => candidate && candidate.trim())?.trim() ?? 'User';
}

export default async function IngestPage() {
  const scope = await requireSessionWorkspace();
  const [documents, userName] = await Promise.all([
    getAllDocumentsForLibrary(scope),
    getCurrentUserName(),
  ]);

  const stats: IngestWorkspaceStats = {
    totalRecords: documents.length,
    directImports: documents.filter((document) => !document.is_webscout_discovered).length,
    researchImports: documents.filter((document) => document.is_webscout_discovered).length,
    favorites: documents.filter((document) => document.is_favorite).length,
    cleanupCandidates: documents.filter((document) => Boolean(getDocumentTitleIssue(document.title))).length,
  };

  const recentDocuments: IngestWorkspaceDocument[] = documents.slice(0, 4).map((document) => ({
    id: document.id,
    title: document.title,
    source: document.source,
    imported_at: document.imported_at,
    is_webscout_discovered: document.is_webscout_discovered,
  }));

  return <IngestWorkspace recentDocuments={recentDocuments} stats={stats} userName={userName} />;
}
