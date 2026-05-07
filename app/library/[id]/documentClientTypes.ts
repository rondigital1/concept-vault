import type { CollectionRow } from '@/server/repos/collections.repo';

export type LibraryDocumentDetail = {
  id: string;
  title: string;
  source: string;
  content: string;
  tags: string[];
  is_favorite: boolean;
  imported_at: string;
};

export type DocumentClientProps = {
  document: LibraryDocumentDetail;
  collections: CollectionRow[];
  memberCollectionIds: string[];
};
