'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { toast, ToastContainer } from '@/app/components/Toast';
import { ingestContent } from './actions';

type IngestMode = 'text' | 'file' | 'url';

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.md', '.csv'];
const MAX_FILE_SIZE_MB = 10;

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

  const handleFileSelect = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
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

      toast.success(`File uploaded successfully! Extracted ${result.extractedLength.toLocaleString()} characters.`);

      setTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        router.push('/library');
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    if (content.trim().length < 50) {
      toast.error('Content must be at least 50 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await ingestContent({
        title: title.trim() || undefined,
        source: source.trim() || undefined,
        content: content.trim(),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Content ingested successfully!');

      setTitle('');
      setSource('');
      setContent('');

      setTimeout(() => {
        router.push('/library');
      }, 1500);
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
        {/* Header */}
        <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="mx-auto max-w-4xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Ingest Content</h1>
                <p className="text-sm text-zinc-400 mt-1">Add new documents to your vault</p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="space-y-6">
            {/* Mode Selector */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10 w-fit">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'text'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white'
                  }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'file'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white'
                  }`}
              >
                File
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'url'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white'
                  }`}
              >
                URL
              </button>
            </div>

            {/* Title Input (shared) */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                Title <span className="text-zinc-500">(optional)</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'file' ? 'Auto-generated from filename if left empty' : 'Document title (auto-generated if left empty)'}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
              />
            </div>

            {/* File Upload Mode */}
            {mode === 'file' && (
              <div className="space-y-4">
                {/* Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#d97757] bg-[#d97757]/10'
                      : selectedFile
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-white/20 hover:border-white/40 bg-white/5'
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
                      <div className="h-12 w-12 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-zinc-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="text-sm text-zinc-400 hover:text-white underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-12 w-12 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-sm text-zinc-400">
                          PDF, TXT, DOCX, MD, or CSV (max {MAX_FILE_SIZE_MB}MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="text-sm text-zinc-500">
                    Text will be extracted and tags auto-generated
                  </div>
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={isLoading || !selectedFile}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      isLoading || !selectedFile
                        ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                        : 'bg-[#d97757] text-white hover:bg-[#c66849] shadow-lg hover:shadow-xl hover:scale-[1.02]'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner className="h-4 w-4 border-white/40 border-t-white" />
                        Uploading...
                      </span>
                    ) : (
                      'Upload File'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Text Mode */}
            {mode === 'text' && (
              <form onSubmit={handleTextSubmit} className="space-y-6">
                {/* Source Input */}
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-white mb-2">
                    Source <span className="text-zinc-500">(optional)</span>
                  </label>
                  <input
                    id="source"
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g., Book: Deep Work, Lecture Notes, etc."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                  />
                </div>

                {/* Content Input */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                    Content <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={'Paste your content here...\n\nMinimum 50 characters required.\n\nSupports Markdown formatting:\n# Headings\n**bold**, *italic*\n- Lists\n[links](url)\n`code`'}
                    rows={16}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent font-mono text-sm resize-y"
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-500 flex items-center justify-between">
                    <span>
                      {content.length} characters {content.length < 50 && `(${50 - content.length} more needed)`}
                    </span>
                    <span className="text-zinc-600">
                      Markdown supported: headings, bold, italic, lists, links, code
                    </span>
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="text-sm text-zinc-500">
                    Tags will be automatically extracted
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !content.trim() || content.trim().length < 50}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${isLoading || !content.trim() || content.trim().length < 50
                      ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#d97757] text-white hover:bg-[#c66849] shadow-lg hover:shadow-xl hover:scale-[1.02]'
                      }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner className="h-4 w-4 border-white/40 border-t-white" />
                        Ingesting...
                      </span>
                    ) : (
                      'Ingest Content'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* URL Mode */}
            {mode === 'url' && (
              <form onSubmit={handleTextSubmit} className="space-y-6">
                {/* URL Input */}
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-white mb-2">
                    URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="source"
                    type="url"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                    required
                  />
                </div>

                {/* Content Input */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                    Content <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste URL above or add additional notes here..."
                    rows={16}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent font-mono text-sm resize-y"
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-500 flex items-center justify-between">
                    <span>
                      {content.length} characters {content.length < 50 && `(${50 - content.length} more needed)`}
                    </span>
                    <span className="text-zinc-600">
                      Markdown supported
                    </span>
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="text-sm text-zinc-500">
                    Tags will be automatically extracted
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !content.trim() || content.trim().length < 50}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${isLoading || !content.trim() || content.trim().length < 50
                      ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#d97757] text-white hover:bg-[#c66849] shadow-lg hover:shadow-xl hover:scale-[1.02]'
                      }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner className="h-4 w-4 border-white/40 border-t-white" />
                        Ingesting...
                      </span>
                    ) : (
                      'Ingest Content'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
