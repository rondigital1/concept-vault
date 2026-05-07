import { useRef, useState } from 'react';
import {
  getDefaultFeedback,
  getReadyStateLabel,
  getTitlePlaceholder,
} from '../ingestPresentation';
import { isIngestActionDisabled } from '../ingestWorkflowState';
import type { FeedbackState, IngestMode } from '../types';
import { useIngestFileSelection } from './useIngestFileSelection';
import { useIngestSubmission } from './useIngestSubmission';

export function useIngestWorkflow() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<IngestMode>('file');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null);

  const feedback = feedbackState ?? getDefaultFeedback(mode, selectedFile, source, content);
  const titlePlaceholder = getTitlePlaceholder(mode);
  const isActionDisabled = isIngestActionDisabled({
    mode,
    selectedFile,
    source,
    content,
  });
  const readyState = getReadyStateLabel(mode, selectedFile, source, content);

  const {
    openFilePicker,
    handleDrag,
    handleDrop,
    handleFileInputChange,
    clearFile,
  } = useIngestFileSelection({
    fileInputRef,
    title,
    setTitle,
    setSelectedFile,
    setDragActive,
    setFeedbackState,
  });
  const {
    isLoading,
    setIsLoading,
    handleFileUpload,
    handleSubmit,
  } = useIngestSubmission({
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
  });

  const handleTitleChange = (value: string) => {
    setFeedbackState(null);
    setTitle(value);
  };

  const handleSourceChange = (value: string) => {
    setFeedbackState(null);
    setSource(value);
  };

  const handleContentChange = (value: string) => {
    setFeedbackState(null);
    setContent(value);
  };

  const switchMode = (nextMode: IngestMode) => {
    setMode(nextMode);
    setIsLoading(false);
    setFeedbackState(null);

    if (nextMode !== 'file') {
      setDragActive(false);
    }
  };

  return {
    mode,
    title,
    source,
    content,
    isLoading,
    selectedFile,
    dragActive,
    feedback,
    titlePlaceholder,
    isActionDisabled,
    readyState,
    fileInputRef,
    handleTitleChange,
    handleSourceChange,
    handleContentChange,
    handleDrag,
    handleDrop,
    handleFileInputChange,
    handleFileUpload,
    openFilePicker,
    clearFile,
    switchMode,
    handleSubmit,
  };
}
