import { notFound } from 'next/navigation';
import { getDocument } from '@/server/services/document.service';
import { listCollections, getCollectionIdsForDocument } from '@/server/repos/collections.repo';
import { DocumentClient } from './DocumentClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage(props: PageProps) {
  const params = await props.params;
  const [document, collections, memberCollectionIds] = await Promise.all([
    getDocument(params.id),
    listCollections(),
    getCollectionIdsForDocument(params.id),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <DocumentClient
      document={document}
      collections={collections}
      memberCollectionIds={memberCollectionIds}
    />
  );
}
