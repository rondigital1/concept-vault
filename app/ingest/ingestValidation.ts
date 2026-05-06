import type { FeedbackState } from './types';

export type IngestValidationError = {
  feedback: FeedbackState;
  toastMessage: string;
};

export function getMissingFileError(): IngestValidationError {
  return {
    feedback: {
      tone: 'error',
      eyebrow: 'Missing file',
      title: 'Select a file before uploading',
      description: 'Choose a supported file from your machine, then try the upload again.',
    },
    toastMessage: 'Please select a file',
  };
}

export function validateUrlSource(source: string): IngestValidationError | null {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return {
      feedback: {
        tone: 'error',
        eyebrow: 'Missing URL',
        title: 'Paste a public page URL',
        description: 'Paste the page address first so the vault can fetch it inline.',
      },
      toastMessage: 'URL is required',
    };
  }

  try {
    const parsed = new URL(trimmedSource);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        feedback: {
          tone: 'error',
          eyebrow: 'Invalid URL',
          title: 'Only http and https URLs are supported',
          description: 'Use a public page address that starts with http:// or https://.',
        },
        toastMessage: 'URL must use http or https',
      };
    }
  } catch {
    return {
      feedback: {
        tone: 'error',
        eyebrow: 'Invalid URL',
        title: 'Enter a valid page URL',
        description: 'Use a complete public URL so the vault can fetch the page inline.',
      },
      toastMessage: 'Please enter a valid URL',
    };
  }

  return null;
}

export function validateTextContent(content: string): IngestValidationError | null {
  if (content.trim().length >= 50) {
    return null;
  }

  return {
    feedback: {
      tone: 'error',
      eyebrow: 'More text needed',
      title: 'Paste at least 50 characters',
      description: 'Short notes do not provide enough signal for tagging and retrieval.',
    },
    toastMessage: 'Content must be at least 50 characters',
  };
}
