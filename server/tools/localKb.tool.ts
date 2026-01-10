export interface LocalKbQuery {
  query: string;
  limit?: number;
}

export interface LocalKbResult {
  documentId: string;
  content: string;
  score: number;
}

export async function localKbTool(
  input: LocalKbQuery
): Promise<LocalKbResult[]> {
  // TODO: Implement vector search using pgvector
  // - Generate query embedding
  // - Perform similarity search
  // - Return top results
  return [];
}
