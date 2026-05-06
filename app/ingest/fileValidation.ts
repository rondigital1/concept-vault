import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB } from './constants';
import type { FeedbackState } from './types';

type ValidFileResult = {
  ok: true;
};

type InvalidFileResult = {
  ok: false;
  feedback: FeedbackState;
  toastMessage: string;
};

export type FileValidationResult = ValidFileResult | InvalidFileResult;

export function validateIngestFile(file: File): FileValidationResult {
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      feedback: {
        tone: 'error',
        eyebrow: 'Unsupported file',
        title: 'This file type is not supported',
        description: `Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      },
      toastMessage: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return {
      ok: false,
      feedback: {
        tone: 'error',
        eyebrow: 'File too large',
        title: 'Choose a smaller file',
        description: `The current size limit is ${MAX_FILE_SIZE_MB}MB per upload.`,
      },
      toastMessage: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  return {
    ok: true,
  };
}
