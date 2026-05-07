import type { IngestMode } from './types';

type IngestActionDisabledArgs = {
  mode: IngestMode;
  selectedFile: File | null;
  source: string;
  content: string;
};

export function isIngestActionDisabled({
  mode,
  selectedFile,
  source,
  content,
}: IngestActionDisabledArgs): boolean {
  if (mode === 'file') {
    return !selectedFile;
  }

  if (mode === 'url') {
    return source.trim().length === 0;
  }

  return content.trim().length < 50;
}
