export type DocumentRow = {
  id: string;
  workspace_id?: string;
  source: string;
  title: string;
  content: string;
  tags: string[];
  content_hash: string;
  is_favorite: boolean;
  imported_at: string;
};

export type LibraryDocumentRow = DocumentRow & {
  is_webscout_discovered: boolean;
};
