import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeToggle } from './components/ThemeToggle';

const themeInitScript = `
(() => {
  const storageKey = 'concept-vault-theme';
  const root = document.documentElement;
  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const theme =
      storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system'
        ? storedTheme
        : 'system';
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

    root.dataset.theme = theme;
    root.dataset.resolvedTheme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  } catch {
    root.dataset.theme = 'system';
    root.dataset.resolvedTheme = getSystemTheme();
    root.style.colorScheme = root.dataset.resolvedTheme;
  }
})();
`;

export const metadata: Metadata = {
  title: 'Concept Vault',
  description: 'Topic-based research workflow for collecting sources, reviewing proposals, and generating reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-white/20">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black text-lg font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                V
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Concept Vault</span>
            </Link>

            <div className="flex gap-2">
              <Link
                href="/today"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Research
              </Link>
              <Link
                href="/library"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Library
              </Link>
              <Link
                href="/reports"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Reports
              </Link>
              <Link
                href="/ingest"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Add Content
              </Link>
              <Link
                href="/chat"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Ask Vault
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <ThemeToggle />
          </div>
        </footer>
      </body>
    </html>
  );
}
