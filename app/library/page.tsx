import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getAllDocumentsForLibrary } from '@/server/services/document.service';
import { LibraryDashboardFooter } from './components/LibraryDashboardFooter';
import { LibraryEmptyState } from './components/LibraryEmptyState';
import { LibraryOverviewStats } from './components/LibraryOverviewStats';
import { LibraryRepositorySection } from './components/LibraryRepositorySection';
import { LibrarySignalLanes } from './components/LibrarySignalLanes';
import { buildLibraryPageModel } from './libraryPageModel';

export default async function LibraryPage() {
  const scope = await requireSessionWorkspace();
  const documents = await getAllDocumentsForLibrary(scope);
  const model = buildLibraryPageModel(documents);

  return (
    <main className="relative px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1220px]">
        {model.documents.length === 0 ? (
          <LibraryEmptyState />
        ) : (
          <>
            <LibraryOverviewStats
              documentCount={model.documents.length}
              favoriteCount={model.favorites.length}
              cleanupCount={model.documentsNeedingCleanup.length}
              researchCount={model.researchDocuments.length}
              formatCounts={model.formatCounts}
              topClusters={model.topClusters}
            />

            <LibraryRepositorySection
              featuredDocument={model.featuredDocument}
              repositoryDocuments={model.repositoryDocuments}
              cleanupCount={model.documentsNeedingCleanup.length}
              favoriteCount={model.favorites.length}
            />

            <LibrarySignalLanes
              documentsNeedingCleanup={model.documentsNeedingCleanup}
              favorites={model.favorites}
            />

            <LibraryDashboardFooter
              favoriteCount={model.favorites.length}
              cleanupCount={model.documentsNeedingCleanup.length}
              researchCount={model.researchDocuments.length}
            />
          </>
        )}
      </div>
    </main>
  );
}
