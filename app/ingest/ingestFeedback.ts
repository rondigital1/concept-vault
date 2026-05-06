import type { IngestResult } from './actions';
import type { UploadIngestResult } from './ingestRequests';
import type { FeedbackState, IngestMode } from './types';

export type FeedbackToast = {
  feedback: FeedbackState;
  toastMessage: string;
};

export function getUploadLoadingFeedback(): FeedbackState {
  return {
    tone: 'loading',
    eyebrow: 'Uploading',
    title: 'Extracting and saving your file',
    description: 'The vault is parsing the file inline and will take you to the library when it finishes.',
  };
}

export function getUnexpectedUploadErrorFeedback(): FeedbackState {
  return {
    tone: 'error',
    eyebrow: 'Upload failed',
    title: 'An unexpected upload error occurred',
    description: 'Check the file and try again. If the issue persists, inspect the server logs for the upload route.',
  };
}

export function buildUploadFailureFeedback(result: Extract<UploadIngestResult, { ok: false }>): FeedbackToast {
  const message = result.error || result.message || 'Upload failed';

  return {
    feedback: {
      tone: 'error',
      eyebrow: 'Upload failed',
      title: 'The file could not be imported',
      description: message,
    },
    toastMessage: message,
  };
}

export function buildUploadSuccessFeedback(result: Extract<UploadIngestResult, { ok: true }>): FeedbackToast {
  return {
    feedback: {
      tone: 'success',
      eyebrow: result.created ? 'Import saved' : 'Already in library',
      title: result.created ? 'File added to the library' : 'Matching content already exists',
      description: result.created
        ? `Extracted ${result.extractedLength.toLocaleString()} characters and queued the document for normal follow-on processing.`
        : 'The vault recognized this content and kept the existing library record instead of creating a duplicate.',
    },
    toastMessage: result.created
      ? `Content added successfully. Extracted ${result.extractedLength.toLocaleString()} characters.`
      : 'This content is already in the library.',
  };
}

export function getTextOrUrlLoadingFeedback(mode: Exclude<IngestMode, 'file'>): FeedbackState {
  return {
    tone: 'loading',
    eyebrow: mode === 'url' ? 'Importing page' : 'Saving note',
    title: mode === 'url' ? 'Fetching and saving the page' : 'Adding your text to the library',
    description:
      mode === 'url'
        ? 'The vault is extracting the page inline and will open the library when it completes.'
        : 'Your note is being stored as a new library document.',
  };
}

export function getUnexpectedSubmitErrorFeedback(): FeedbackState {
  return {
    tone: 'error',
    eyebrow: 'Import failed',
    title: 'An unexpected import error occurred',
    description: 'Try the request again. If the issue persists, inspect the server logs for the ingest action.',
  };
}

export function buildSubmitFailureFeedback(result: Extract<IngestResult, { success: false }>): FeedbackToast {
  return {
    feedback: {
      tone: 'error',
      eyebrow: 'Import failed',
      title: 'The content could not be saved',
      description: result.error,
    },
    toastMessage: result.error,
  };
}

export function buildSubmitSuccessFeedback(result: Extract<IngestResult, { success: true }>): FeedbackToast {
  return {
    feedback: {
      tone: 'success',
      eyebrow: result.created ? 'Import saved' : 'Already in library',
      title: result.created ? 'Content added to the library' : 'Matching content already exists',
      description: result.created
        ? 'The document was saved successfully. The library will open in a moment.'
        : 'The vault recognized this content and kept the existing library record instead of creating a duplicate.',
    },
    toastMessage: result.created ? 'Content added successfully.' : 'This content is already in the library.',
  };
}
