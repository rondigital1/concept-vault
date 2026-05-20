import type { LibraryDocumentRow } from '@/server/services/document.service';
import {
  getDocumentTitleIssue,
  inferDocumentFormatBucket,
  type DocumentFormatBucket,
} from './documentPresentation';

type LibraryCluster = {
  label: string;
  count: number;
};

export type LibraryHomeViewModel = {
  documents: LibraryDocumentRow[];
  favorites: LibraryDocumentRow[];
  documentsNeedingCleanup: LibraryDocumentRow[];
  researchDocuments: LibraryDocumentRow[];
  featuredDocument: LibraryDocumentRow | null;
  repositoryDocuments: LibraryDocumentRow[];
  formatCounts: Record<DocumentFormatBucket, number>;
  topClusters: LibraryCluster[];
};

function getTopClusters(documents: LibraryDocumentRow[]): LibraryCluster[] {
  const counts = new Map<string, number>();

  for (const document of documents) {
    for (const tag of document.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const ranked = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  if (ranked.length > 0) {
    return ranked;
  }

  return [
    {
      label: 'research imports',
      count: documents.filter((document) => document.is_webscout_discovered).length,
    },
    { label: 'favorites', count: documents.filter((document) => document.is_favorite).length },
    { label: 'new records', count: documents.length },
  ].filter((cluster) => cluster.count > 0);
}

export function buildLibraryHomeViewModel(documents: LibraryDocumentRow[]): LibraryHomeViewModel {
  const favorites = documents.filter((document) => document.is_favorite);
  const documentsNeedingCleanup = documents.filter((document) =>
    getDocumentTitleIssue(document.title),
  );
  const researchDocuments = documents.filter((document) => document.is_webscout_discovered);
  const featuredDocument = favorites[0] ?? researchDocuments[0] ?? documents[0] ?? null;
  const repositoryDocuments = documents
    .filter((document) => document.id !== featuredDocument?.id)
    .slice(0, 6);
  const formatCounts = documents.reduce<Record<DocumentFormatBucket, number>>(
    (accumulator, document) => {
      accumulator[inferDocumentFormatBucket(document)] += 1;
      return accumulator;
    },
    { pdf: 0, text: 0, web: 0 },
  );

  return {
    documents,
    favorites,
    documentsNeedingCleanup,
    researchDocuments,
    featuredDocument,
    repositoryDocuments,
    formatCounts,
    topClusters: getTopClusters(documents),
  };
}
