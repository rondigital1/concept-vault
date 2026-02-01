import { notFound } from 'next/navigation';
import { getDocument } from '@/server/services/document.service';
import { ensureSchema } from '@/db/schema';
import { client } from '@/db';
import { DocumentClient } from './DocumentClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage(props: PageProps) {
  await ensureSchema(client);
  const params = await props.params;
  const document = await getDocument(params.id);

  if (!document) {
    notFound();
  }

  return <DocumentClient document={document} />;
}
