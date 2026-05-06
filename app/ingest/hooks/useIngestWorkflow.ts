import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useRef,
  useState,
} from 'react';
import { toast } from '@/app/components/Toast';
import { validateIngestFile } from '../fileValidation';
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
  getDefaultFeedback,
  getReadyStateLabel,
  getTitlePlaceholder,
} from '../ingestPresentation';
import {
  submitTextOrUrlIngest,
  uploadIngestFile,
} from '../ingestRequests';
import type { FeedbackState, IngestMode } from '../types';

export function useIngestWorkflow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<IngestMode>('file');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null);

  const isTextReady = content.trim().length >= 50;
  const isUrlReady = source.trim().length > 0;
  const isFileReady = Boolean(selectedFile);
  const isActionDisabled = mode === 'file' ? !isFileReady : mode === 'url' ? !isUrlReady : !isTextReady;
  const readyState = getReadyStateLabel(mode, selectedFile, source, content);
  const feedback = feedbackState ?? getDefaultFeedback(mode, selectedFile, source, content);
  const titlePlaceholder = getTitlePlaceholder(mode);

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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const resetAndRedirect = () => {
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
  };

  const handleFileSelect = (file: File) => {
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
  };

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileSelect(event.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileSelect(event.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
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
  };

  const handleSubmit = async (event: FormEvent) => {
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
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFeedbackState(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
