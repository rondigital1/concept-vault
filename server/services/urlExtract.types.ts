export type UrlExtractionResult = {
  title?: string;
  content: string;
  method: 'tavily' | 'fetch';
};
