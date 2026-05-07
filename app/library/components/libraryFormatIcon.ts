import type { DocumentFormatBucket } from '../documentPresentation';

export function getLibraryFormatIconName(format: DocumentFormatBucket) {
  switch (format) {
    case 'pdf':
      return 'pdf';
    case 'web':
      return 'link';
    default:
      return 'file';
  }
}
