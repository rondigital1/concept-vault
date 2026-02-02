import { Suspense } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ChatPageContent } from './ChatPageContent';

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-stone-50 items-center justify-center">
          <div className="flex items-center gap-3 text-stone-500">
            <LoadingSpinner className="h-5 w-5 border-stone-300 border-t-stone-600" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
