import { Suspense } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ChatPageContent } from './ChatPageContent';

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-black">
          <div className="flex items-center gap-3 text-zinc-400">
            <LoadingSpinner className="h-5 w-5 border-zinc-700 border-t-zinc-200" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
