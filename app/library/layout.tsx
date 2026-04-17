import { listDocuments } from '@/server/repos/documents.repo';
import { listCollections } from '@/server/repos/collections.repo';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { Inter } from 'next/font/google';
import { LibraryShell } from './components/LibraryShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const librarySans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const scope = await requireSessionWorkspace();
  const [documents, collections] = await Promise.all([
    listDocuments(scope),
    listCollections(scope),
  ]);

  return (
    <div className={librarySans.className}>
      <LibraryShell documents={documents} collections={collections}>
        {children}
      </LibraryShell>
    </div>
  );
}
