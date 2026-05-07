import {
  extractTextFromUploadedFile,
  isAllowedUploadFileType,
  MAX_UPLOAD_FILE_SIZE,
} from './uploadedFileText';

export const SHORT_UPLOADED_CONTENT_MESSAGE =
  'Extracted content is too short (min 50 chars). The file may be empty or contain only images.';

export class UploadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRequestError';
  }
}

export interface PreparedUploadedDocument {
  content: string;
  source: string;
  title: string;
}

export async function prepareUploadedDocument(request: Request): Promise<PreparedUploadedDocument> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const titleInput = formData.get('title') as string | null;

  if (!file) {
    throw new UploadRequestError('No file provided');
  }

  validateUploadedFile(file);

  const { text, error } = await extractTextFromUploadedFile(file);
  if (error) {
    throw new UploadRequestError(error);
  }

  const content = text.trim();
  if (!content) {
    throw new UploadRequestError('Could not extract any text from the file');
  }

  if (content.length < 50) {
    throw new UploadRequestError(SHORT_UPLOADED_CONTENT_MESSAGE);
  }

  return {
    title: deriveUploadedDocumentTitle(titleInput, file.name),
    source: `file:${file.name}`,
    content,
  };
}

function validateUploadedFile(file: File): void {
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    throw new UploadRequestError(
      `File too large. Maximum size is ${MAX_UPLOAD_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  if (!isAllowedUploadFileType(file)) {
    throw new UploadRequestError('Unsupported file type. Allowed: PDF, TXT, DOCX, MD, CSV');
  }
}

function deriveUploadedDocumentTitle(titleInput: string | null, fileName: string): string {
  return titleInput?.trim() || fileName.replace(/\.[^/.]+$/, '').slice(0, 200) || 'Untitled';
}
