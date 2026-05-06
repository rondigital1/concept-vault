import { ingestContent, type IngestResult } from './actions';
import type { IngestMode } from './types';

export type UploadIngestResult =
  | {
      ok: true;
      created: boolean;
      extractedLength: number;
    }
  | {
      ok: false;
      error?: string;
      message?: string;
    };

export async function uploadIngestFile(file: File, title: string): Promise<UploadIngestResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (title.trim()) {
    formData.append('title', title.trim());
  }

  const response = await fetch('/api/ingest/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json() as Promise<UploadIngestResult>;
}

export async function submitTextOrUrlIngest({
  mode,
  title,
  source,
  content,
}: {
  mode: Exclude<IngestMode, 'file'>;
  title: string;
  source: string;
  content: string;
}): Promise<IngestResult> {
  return ingestContent({
    title: title.trim() || undefined,
    source: source.trim() || undefined,
    content: mode === 'url' ? undefined : content.trim(),
  });
}
