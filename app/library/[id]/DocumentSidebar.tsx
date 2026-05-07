import { AddToCollectionMenu } from '@/app/library/components/AddToCollectionMenu';
import {
  getLibraryActionClassName,
  LibraryPanel,
} from '@/app/library/components/LibraryPrimitives';
import type { CollectionRow } from '@/server/repos/collections.repo';
import {
  DOCUMENT_FORMAT_LABELS,
  type DocumentFormatBucket,
} from '../documentPresentation';
import type { LibraryDocumentDetail } from './documentClientTypes';

type Props = {
  document: LibraryDocumentDetail;
  collections: CollectionRow[];
  memberCollectionIds: string[];
  format: DocumentFormatBucket;
  isFavPending: boolean;
  onFavoriteToggle: () => void;
  onTitleEditStart: () => void;
  onDeleteRequest: () => void;
};

export function DocumentSidebar({
  document,
  collections,
  memberCollectionIds,
  format,
  isFavPending,
  onFavoriteToggle,
  onTitleEditStart,
  onDeleteRequest,
}: Props) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      <LibraryPanel className="px-5 py-5">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
          Actions
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <AddToCollectionMenu
            documentId={document.id}
            collections={collections}
            memberCollectionIds={memberCollectionIds}
            buttonClassName={`${getLibraryActionClassName('secondary')} w-full`}
          />
          <button
            type="button"
            onClick={onFavoriteToggle}
            disabled={isFavPending}
            className={`${getLibraryActionClassName(document.is_favorite ? 'primary' : 'secondary')} w-full`}
            aria-pressed={document.is_favorite}
          >
            {isFavPending ? 'Working...' : document.is_favorite ? 'Favorited' : 'Add favorite'}
          </button>
          <button
            type="button"
            onClick={onTitleEditStart}
            className={`${getLibraryActionClassName('secondary')} w-full`}
          >
            Rename title
          </button>
          <button
            type="button"
            onClick={onDeleteRequest}
            className={`${getLibraryActionClassName('danger')} w-full`}
          >
            Delete document
          </button>
        </div>
      </LibraryPanel>

      <LibraryPanel className="px-5 py-5">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
          Record status
        </p>
        <div className="mt-4 space-y-4 text-sm text-[#c3bbbb]">
          <div className="rounded-[22px] bg-[#101010] px-4 py-4">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
              Format
            </p>
            <p className="mt-2 text-[0.95rem] font-semibold text-white">
              {DOCUMENT_FORMAT_LABELS[format]}
            </p>
          </div>
          <div className="rounded-[22px] bg-[#101010] px-4 py-4">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
              Collections
            </p>
            <p className="mt-2 text-[0.95rem] font-semibold text-white">
              {memberCollectionIds.length} membership{memberCollectionIds.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-[22px] bg-[#101010] px-4 py-4">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
              State
            </p>
            <p className="mt-2 text-[0.95rem] font-semibold text-white">
              {document.is_favorite ? 'Pinned for quick access' : 'Available in the core library'}
            </p>
          </div>
        </div>
      </LibraryPanel>
    </aside>
  );
}
