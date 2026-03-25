'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { toast, ToastContainer } from '@/app/components/Toast';
import { ingestContent } from './actions';

type IngestMode = 'text' | 'file' | 'url';

type ModeConfig = {
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  footerNote: string;
};

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.md', '.csv'];
const MAX_FILE_SIZE_MB = 10;

const MODE_CONFIG: Record<IngestMode, ModeConfig> = {
  text: {
    label: 'Paste text',
    title: 'Add notes, excerpts, or transcripts',
    description: 'Best for copied articles, meeting notes, and manual summaries.',
    actionLabel: 'Add Note',
    footerNote: 'We will save the text and extract tags automatically.',
  },
  file: {
    label: 'Upload file',
    title: 'Import a document from your computer',
    description: 'Use this for PDFs, markdown files, CSVs, and other source documents.',
    actionLabel: 'Upload File',
    footerNote: 'We will extract the text and send you to the library when the import finishes.',
  },
  url: {
    label: 'Import URL',
    title: 'Fetch an article or page from the web',
    description: 'Use this for blog posts, docs pages, and public links you want in the vault.',
    actionLabel: 'Import URL',
    footerNote: 'We will fetch the page content and add it to your library.',
  },
};

function ModeButton({
  mode,
  selected,
  onSelect,
}: {
  mode: IngestMode;
  selected: boolean;
  onSelect: (mode: IngestMode) => void;
}) {
  const config = MODE_CONFIG[mode];

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`rounded-2xl border p-4 text-left transition-all ${
        selected
          ? 'border-[#d97757]/50 bg-[#d97757]/10 shadow-[0_12px_30px_rgba(217,119,87,0.12)]'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
      }`}
    >
      <p className="text-sm font-semibold text-white">{config.label}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{config.description}</p>
    </button>
  );
}

function ActionFooter({
  note,
  actionLabel,
  disabled,
  loading,
  onClick,
}: {
  note: string;
  actionLabel: string;
  disabled: boolean;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-sm text-zinc-500">{note}</p>
      <button
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
          disabled || loading
            ? 'cursor-not-allowed bg-white/5 text-zinc-500'
            : 'bg-[#d97757] text-white hover:bg-[#c66849] shadow-lg hover:shadow-xl'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="h-4 w-4 border-white/40 border-t-white" />
            Working...
          </span>
        ) : (
          actionLabel
        )}
      </button>
    </div>
  );
}

export default function IngestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<IngestMode>('text');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const modeConfig = MODE_CONFIG[mode];
  const titlePlaceholder =
    mode === 'file'
      ? 'Leave blank to use the filename'
      : mode === 'url'
        ? 'Leave blank to use the page title'
        : 'Optional title for this note or excerpt';

  const isTextReady = content.trim().length >= 50;
  const isUrlReady = source.trim().length > 0;
  const isFileReady = Boolean(selectedFile);
  const isActionDisabled =
    mode === 'file' ? !isFileReady : mode === 'url' ? !isUrlReady : !isTextReady;

  const resetAndRedirect = () => {
    setTitle('');
    setSource('');
    setContent('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => {
      router.push('/library');
    }, 1500);
  };

  const handleFileSelect = (file: File) => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (title.trim()) {
        formData.append('title', title.trim());
      }

      const response = await fetch('/api/ingest/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.ok) {
        toast.error(result.error || result.message || 'Upload failed');
        return;
      }

      toast.success(`Content added successfully. Extracted ${result.extractedLength.toLocaleString()} characters.`);
      resetAndRedirect();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'url') {
      const trimmedSource = source.trim();
      if (!trimmedSource) {
        toast.error('URL is required');
        return;
      }

      try {
        const parsed = new URL(trimmedSource);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          toast.error('URL must use http or https');
          return;
        }
      } catch {
        toast.error('Please enter a valid URL');
        return;
      }
    } else if (!isTextReady) {
      toast.error('Content must be at least 50 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await ingestContent({
        title: title.trim() || undefined,
        source: source.trim() || undefined,
        content: mode === 'url' ? undefined : content.trim(),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Content added successfully.');
      resetAndRedirect();
    } catch (error) {
      console.error('Ingest error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <ToastContainer />
      <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Add Content</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Bring new source material into the vault, then use Research to review candidates and generate reports.
                </p>
              </div>
              <Link
                href="/today"
                className="inline-flex items-center text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                ← Research
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Choose a starting point
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <ModeButton mode="text" selected={mode === 'text'} onSelect={setMode} />
                <ModeButton mode="file" selected={mode === 'file'} onSelect={setMode} />
                <ModeButton mode="url" selected={mode === 'url'} onSelect={setMode} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
              <form
                onSubmit={mode === 'file' ? (e) => e.preventDefault() : handleTextSubmit}
                className="space-y-6"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {modeConfig.label}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{modeConfig.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                    {modeConfig.description}
                  </p>
                </div>

                <div>
                  <label htmlFor="title" className="mb-2 block text-sm font-medium text-white">
                    Title <span className="text-zinc-500">(optional)</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={titlePlaceholder}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                  />
                </div>

                {mode === 'file' && (
                  <div className="space-y-6">
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                        dragActive
                          ? 'border-[#d97757] bg-[#d97757]/10'
                          : selectedFile
                            ? 'border-emerald-500/50 bg-emerald-500/5'
                            : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_EXTENSIONS.join(',')}
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      {selectedFile ? (
                        <div className="space-y-3">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                            <svg className="h-6 w-6 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">{selectedFile.name}</p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearFile();
                            }}
                            className="text-sm text-zinc-400 underline transition-colors hover:text-white"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                            <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {dragActive ? 'Drop your file here' : 'Click to upload or drag a file in'}
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              PDF, TXT, DOCX, MD, or CSV up to {MAX_FILE_SIZE_MB}MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <ActionFooter
                      note={modeConfig.footerNote}
                      actionLabel={modeConfig.actionLabel}
                      disabled={isActionDisabled}
                      loading={isLoading}
                      onClick={handleFileUpload}
                    />
                  </div>
                )}

                {mode === 'text' && (
                  <>
                    <div>
                      <label htmlFor="source" className="mb-2 block text-sm font-medium text-white">
                        Source <span className="text-zinc-500">(optional)</span>
                      </label>
                      <input
                        id="source"
                        type="text"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="Book, course, transcript, or where this came from"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="content" className="mb-2 block text-sm font-medium text-white">
                        Content <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={'Paste your content here.\n\nMarkdown is supported for headings, lists, links, and code.'}
                        rows={16}
                        className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                        required
                      />
                      <div className="mt-2 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {content.length} characters
                          {content.length < 50 ? ` (${50 - content.length} more needed)` : ''}
                        </span>
                        <span>Headings, lists, links, and code blocks are supported.</span>
                      </div>
                    </div>

                    <ActionFooter
                      note={modeConfig.footerNote}
                      actionLabel={modeConfig.actionLabel}
                      disabled={isActionDisabled}
                      loading={isLoading}
                    />
                  </>
                )}

                {mode === 'url' && (
                  <>
                    <div>
                      <label htmlFor="source" className="mb-2 block text-sm font-medium text-white">
                        URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="source"
                        type="url"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="https://example.com/article"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-zinc-300">
                        We will fetch the page, extract readable content, and save the result into your library.
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        This works best for public articles, docs pages, and public X.com posts.
                      </p>
                    </div>

                    <ActionFooter
                      note={modeConfig.footerNote}
                      actionLabel={modeConfig.actionLabel}
                      disabled={isActionDisabled}
                      loading={isLoading}
                    />
                  </>
                )}
              </form>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
