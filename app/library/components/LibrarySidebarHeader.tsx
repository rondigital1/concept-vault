'use client';

import { LibraryIcon } from './LibraryIcon';

type Props = {
  onCollapse?: () => void;
};

export function LibrarySidebarHeader({ onCollapse }: Props) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[#7f7979]">
          Research_Unit_01
        </p>
        <h2 className="mt-3 text-[1.08rem] font-bold tracking-[-0.045em] text-white">
          Repository index
        </h2>
        <p className="mt-2 text-[0.76rem] leading-6 text-[#8e8787]">
          Search, organize, and reopen source material held inside the vault.
        </p>
      </div>
      {onCollapse ? (
        <button
          type="button"
          onClick={onCollapse}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#b6afaf] transition hover:bg-white/10 hover:text-white"
          aria-label="Collapse library navigation"
        >
          <LibraryIcon name="panel-close" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
