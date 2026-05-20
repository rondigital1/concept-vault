import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getAllDocumentsForLibrary } from '@/server/services/document.service';
import { EmptyLibraryState, LibraryHomeDashboard } from './components/LibraryHomeSections';
import { buildLibraryHomeViewModel } from './libraryHomeViewModel';

export default async function LibraryPage() {
  const scope = await requireSessionWorkspace();
  const documents = await getAllDocumentsForLibrary(scope);
  const viewModel = buildLibraryHomeViewModel(documents);

  return (
    <main className="relative px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1220px]">
        {documents.length === 0 ? (
          <EmptyLibraryState />
        ) : (
          <LibraryHomeDashboard viewModel={viewModel} />
        )}
      </div>
    </main>
  );
}
