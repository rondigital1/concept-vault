import { MODE_CONFIG } from '../constants';
import type { IngestMode } from '../types';

export function IngestModeTabs({
  mode,
  onSelect,
}: {
  mode: IngestMode;
  onSelect: (mode: IngestMode) => void;
}) {
  return (
    <div className="mb-6 grid w-full max-w-md grid-cols-1 gap-1 rounded-[1.4rem] bg-[#1b1b1b] p-1 min-[380px]:grid-cols-3 min-[380px]:rounded-full sm:inline-flex sm:w-auto">
      {(Object.keys(MODE_CONFIG) as IngestMode[]).map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => onSelect(candidate)}
          className={`min-w-0 flex-1 rounded-full px-3 py-3 text-center text-[0.68rem] font-bold uppercase tracking-[0.14em] transition sm:px-4 sm:text-[0.72rem] sm:tracking-[0.22em] ${
            mode === candidate ? 'bg-[#353535] text-white' : 'text-[#958f8f] hover:text-white'
          }`}
        >
          {MODE_CONFIG[candidate].label}
        </button>
      ))}
    </div>
  );
}
