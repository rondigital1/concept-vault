import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { toast } from '@/app/components/Toast';
import {
  buildSubmitFailureFeedback,
  buildSubmitSuccessFeedback,
  buildUploadFailureFeedback,
  buildUploadSuccessFeedback,
  getTextOrUrlLoadingFeedback,
  getUnexpectedSubmitErrorFeedback,
  getUnexpectedUploadErrorFeedback,
  getUploadLoadingFeedback,
} from '../ingestFeedback';
import {
  getMissingFileError,
  validateTextContent,
  validateUrlSource,
} from '../ingestValidation';
import {
  submitTextOrUrlIngest,
  uploadIngestFile,
} from '../ingestRequests';
import type { FeedbackState, IngestMode } from '../types';

type UseIngestSubmissionArgs = {
  mode: IngestMode;
  title: string;
  source: string;
  content: string;
  selectedFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setTitle: Dispatch<SetStateAction<string>>;
  setSource: Dispatch<SetStateAction<string>>;
  setContent: Dispatch<SetStateAction<string>>;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  setDragActive: Dispatch<SetStateAction<boolean>>;
  setFeedbackState: Dispatch<SetStateAction<FeedbackState | null>>;
};

export function useIngestSubmission({
  mode,
  title,
  source,
  content,
  selectedFile,
  fileInputRef,
  setTitle,
  setSource,
  setContent,
  setSelectedFile,
  setDragActive,
  setFeedbackState,
}: UseIngestSubmissionArgs) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const resetAndRedirect = useCallback(() => {
    setTitle('');
    setSource('');
    setContent('');
    setSelectedFile(null);
    setDragActive(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => {
      router.push('/library');
    }, 1500);
  }, [
    fileInputRef,
    router,
    setContent,
    setDragActive,
    setSelectedFile,
    setSource,
    setTitle,
  ]);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) {
      const validation = getMissingFileError();
      setFeedbackState(validation.feedback);
      toast.error(validation.toastMessage);
      return;
    }

    setIsLoading(true);
    setFeedbackState(getUploadLoadingFeedback());

    try {
      const result = await uploadIngestFile(selectedFile, title);

      if (!result.ok) {
        const failure = buildUploadFailureFeedback(result);
        setFeedbackState(failure.feedback);
        toast.error(failure.toastMessage);
        return;
      }

      const success = buildUploadSuccessFeedback(result);
      setFeedbackState(success.feedback);
      toast.success(success.toastMessage);
      resetAndRedirect();
    } catch (error) {
      console.error('Upload error:', error);
      setFeedbackState(getUnexpectedUploadErrorFeedback());
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [resetAndRedirect, selectedFile, setFeedbackState, title]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (mode === 'url') {
        const validation = validateUrlSource(source);

        if (validation) {
          setFeedbackState(validation.feedback);
          toast.error(validation.toastMessage);
          return;
        }
      } else {
        const validation = validateTextContent(content);

        if (validation) {
          setFeedbackState(validation.feedback);
          toast.error(validation.toastMessage);
          return;
        }
      }

      setIsLoading(true);
      setFeedbackState(getTextOrUrlLoadingFeedback(mode === 'url' ? 'url' : 'text'));

      try {
        const result = await submitTextOrUrlIngest({
          mode: mode === 'url' ? 'url' : 'text',
          title,
          source,
          content,
        });

        if (!result.success) {
          const failure = buildSubmitFailureFeedback(result);
          setFeedbackState(failure.feedback);
          toast.error(failure.toastMessage);
          return;
        }

        const success = buildSubmitSuccessFeedback(result);
        setFeedbackState(success.feedback);
        toast.success(success.toastMessage);
        resetAndRedirect();
      } catch (error) {
        console.error('Ingest error:', error);
        setFeedbackState(getUnexpectedSubmitErrorFeedback());
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [content, mode, resetAndRedirect, setFeedbackState, source, title],
  );

  return {
    isLoading,
    setIsLoading,
    handleFileUpload,
    handleSubmit,
  };
}
