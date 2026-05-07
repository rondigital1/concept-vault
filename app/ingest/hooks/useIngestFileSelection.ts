import { type ChangeEvent, type DragEvent, useCallback } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { toast } from '@/app/components/Toast';
import { validateIngestFile } from '../fileValidation';
import type { FeedbackState } from '../types';

type UseIngestFileSelectionArgs = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  setDragActive: Dispatch<SetStateAction<boolean>>;
  setFeedbackState: Dispatch<SetStateAction<FeedbackState | null>>;
};

export function useIngestFileSelection({
  fileInputRef,
  title,
  setTitle,
  setSelectedFile,
  setDragActive,
  setFeedbackState,
}: UseIngestFileSelectionArgs) {
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validation = validateIngestFile(file);

      if (!validation.ok) {
        setFeedbackState(validation.feedback);
        toast.error(validation.toastMessage);
        return;
      }

      setSelectedFile(file);
      setFeedbackState(null);

      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    },
    [setFeedbackState, setSelectedFile, setTitle, title],
  );

  const handleDrag = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.type === 'dragenter' || event.type === 'dragover') {
        setDragActive(true);
      } else if (event.type === 'dragleave') {
        setDragActive(false);
      }
    },
    [setDragActive],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        handleFileSelect(event.dataTransfer.files[0]);
      }
    },
    [handleFileSelect, setDragActive],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        handleFileSelect(event.target.files[0]);
      }
    },
    [handleFileSelect],
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setFeedbackState(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileInputRef, setFeedbackState, setSelectedFile]);

  return {
    openFilePicker,
    handleFileSelect,
    handleDrag,
    handleDrop,
    handleFileInputChange,
    clearFile,
  };
}
