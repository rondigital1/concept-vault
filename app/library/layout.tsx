import { ensureSchema } from '@/db/schema';
import { client } from '@/db';
import { listDocuments } from '@/server/repos/documents.repo';
import { listCollections } from '@/server/repos/collections.repo';
import { LibraryShell } from './components/LibraryShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSchema(client);

  const [documents, collections] = await Promise.all([
    listDocuments(),
    listCollections(),
  ]);

  return (
    <LibraryShell documents={documents} collections={collections}>
      {children}
    </LibraryShell>
  );
}
