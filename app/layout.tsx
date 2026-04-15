import type { Metadata } from 'next';
import { IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AppChrome } from './components/AppChrome';

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
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
