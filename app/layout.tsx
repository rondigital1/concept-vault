import Link from 'next/link';
import type { Metadata } from 'next';
import { IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { TopNavLinks } from './components/TopNavLinks';
import { ThemeToggle } from './components/ThemeToggle';

const uiSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ui-sans',
  weight: ['400', '500', '600', '700'],
});

const editorialSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-editorial-serif',
  weight: ['400', '600', '700'],
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${uiSans.variable} ${editorialSerif.variable}`}
    >
      <body className="app-shell flex min-h-screen flex-col antialiased selection:bg-[#b9dce2] selection:text-[#10242c]">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <nav className="sticky top-0 z-50 border-b border-[color:var(--workbench-line)] bg-[color:var(--workbench-shell)] backdrop-blur-xl shadow-[0_10px_28px_rgba(43,30,20,0.08)]">
          <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--workbench-line)] bg-[color:var(--workbench-panel)] text-sm font-semibold text-[color:var(--workbench-accent-ink)] shadow-[0_8px_20px_rgba(23,60,73,0.08)]">
                CV
              </div>
              <div className="leading-tight">
                <span className="font-editorial block text-xl tracking-[-0.04em] text-[#10242c]">Concept Vault</span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6d7d86]">
                  Research Workbench
                </span>
              </div>
            </Link>
            <TopNavLinks />
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[color:var(--workbench-line)] bg-[color:var(--workbench-shell)]">
          <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-sm text-[#5b6e77]">
              Operational research surfaces for evidence review, synthesis, and human intervention.
            </p>
            <ThemeToggle />
          </div>
        </footer>
      </body>
    </html>
  );
}
