import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConceptVault',
  description: 'AI-powered knowledge curation and distillation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-white/20">
        <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            {/* Logo/Brand */}
            <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black text-lg font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                V
              </div>
              <span className="text-lg font-bold tracking-tight text-white">ConceptVault</span>
            </a>

            {/* Navigation Links */}
            <div className="flex gap-2">
              <a
                href="/today"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Today
              </a>
              <a
                href="/chat"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                LLM Chat
              </a>
              <a
                href="/reports"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Reports
              </a>
              <a
                href="/library"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Library
              </a>
              <a
                href="/ingest"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-white/10 transition-all hover:scale-105 hover:shadow-white/20"
              >
                Ingest
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
