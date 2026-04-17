import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ChatPageContent } from './ChatPageContent';

const askVaultSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

export default function ChatPage() {
  return (
    <div className={`${askVaultSans.className} min-h-screen bg-[#131313] text-[#e2e2e2]`}>
      <Suspense
        fallback={
          <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
            <div className="absolute left-[-8%] top-[-10%] h-[26rem] w-[26rem] rounded-full bg-white/[0.05] blur-[120px]" />
            <div className="absolute bottom-[-18%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-white/[0.04] blur-[140px]" />

            <div className="relative w-full max-w-xl rounded-[30px] bg-[#171717]/92 px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.04] backdrop-blur-xl">
              <div className="flex items-center gap-4 text-[#d7d2d2]">
                <LoadingSpinner className="h-5 w-5 border-white/[0.14] border-t-[#d0d0d0]" />
                <div>
                  <p className="text-sm font-semibold text-white">Loading Ask Vault</p>
                  <p className="mt-1 text-sm text-[#8e8a8a]">
                    Restoring the chat workspace and session state.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <ChatPageContent />
      </Suspense>
    </div>
  );
}
