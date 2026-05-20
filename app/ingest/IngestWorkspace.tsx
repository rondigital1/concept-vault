'use client';

import { usePathname } from 'next/navigation';
import { ToastContainer } from '@/app/components/Toast';
import { FileModePanel } from './components/FileModePanel';
import { IngestChrome } from './components/IngestChrome';
import { IngestModeTabs } from './components/IngestModeTabs';
import { IngestStatusCard } from './components/IngestStatusCard';
import { RecentImportsSection } from './components/RecentImportsSection';
import { TextModePanel } from './components/TextModePanel';
import { UrlModePanel } from './components/UrlModePanel';
import { monoLabelClass } from './constants';
import { useIngestWorkflow } from './hooks/useIngestWorkflow';
import type { IngestWorkspaceDocument, IngestWorkspaceStats } from './types';

export function IngestWorkspace({
  recentDocuments,
  stats,
  userName,
}: {
  recentDocuments: IngestWorkspaceDocument[];
  stats: IngestWorkspaceStats;
  userName: string;
}) {
  const pathname = usePathname();
  const ingest = useIngestWorkflow();

  return (
    <>
      <ToastContainer />
      <IngestChrome userName={userName} pathname={pathname}>
        <main className="relative min-h-screen pb-14 pt-64 sm:pt-48 lg:pl-64 lg:pt-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
            <header className="mb-12 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className={monoLabelClass}>Add Content</p>
                <h1 className="mt-4 text-[clamp(3.1rem,7vw,5rem)] font-black tracking-normal text-white">
                  Bring new material into the vault.
                </h1>
                <p className="mt-4 max-w-2xl text-[1.05rem] leading-8 text-[#c8c1c1]">
                  Use file upload, URL import, or pasted text to create new library documents without leaving the workspace.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
                <div className="rounded-[1.4rem] border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-5 py-4">
                  <p className={monoLabelClass}>Library documents</p>
                  <p className="mt-3 text-[2.7rem] font-black tracking-normal text-white">
                    {stats.totalRecords.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-5 py-4">
                  <p className={monoLabelClass}>Needs cleanup</p>
                  <p className="mt-3 text-[2.7rem] font-black tracking-normal text-white">
                    {stats.cleanupCandidates.toLocaleString()}
                  </p>
                </div>
              </div>
            </header>

            <div className="animate-workbench-enter">
              <form onSubmit={ingest.mode === 'file' ? (event) => event.preventDefault() : ingest.handleSubmit}>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                  <div className="col-span-1 min-w-0 lg:col-span-7">
                    <IngestModeTabs mode={ingest.mode} onSelect={ingest.switchMode} />

                    {ingest.mode === 'file' && (
                      <FileModePanel
                        dragActive={ingest.dragActive}
                        selectedFile={ingest.selectedFile}
                        title={ingest.title}
                        titlePlaceholder={ingest.titlePlaceholder}
                        isLoading={ingest.isLoading}
                        isActionDisabled={ingest.isActionDisabled}
                        onTitleChange={ingest.handleTitleChange}
                        onDrag={ingest.handleDrag}
                        onDrop={ingest.handleDrop}
                        onOpenFilePicker={ingest.openFilePicker}
                        onFileInputChange={ingest.handleFileInputChange}
                        onClearFile={ingest.clearFile}
                        onUpload={ingest.handleFileUpload}
                        fileInputRef={ingest.fileInputRef}
                      />
                    )}

                    {ingest.mode === 'url' && (
                      <UrlModePanel
                        title={ingest.title}
                        source={ingest.source}
                        titlePlaceholder={ingest.titlePlaceholder}
                        isLoading={ingest.isLoading}
                        isActionDisabled={ingest.isActionDisabled}
                        onTitleChange={ingest.handleTitleChange}
                        onSourceChange={ingest.handleSourceChange}
                      />
                    )}

                    {ingest.mode === 'text' && (
                      <TextModePanel
                        title={ingest.title}
                        source={ingest.source}
                        content={ingest.content}
                        titlePlaceholder={ingest.titlePlaceholder}
                        isLoading={ingest.isLoading}
                        isActionDisabled={ingest.isActionDisabled}
                        onTitleChange={ingest.handleTitleChange}
                        onSourceChange={ingest.handleSourceChange}
                        onContentChange={ingest.handleContentChange}
                      />
                    )}
                  </div>

                  <div className="col-span-1 min-w-0 lg:col-span-5">
                    <IngestStatusCard
                      mode={ingest.mode}
                      readyState={ingest.readyState}
                      stats={stats}
                      feedback={ingest.feedback}
                    />
                  </div>
                </div>
              </form>

              <RecentImportsSection recentDocuments={recentDocuments} />
            </div>
          </div>
        </main>
      </IngestChrome>
    </>
  );
}
