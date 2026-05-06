import { cx } from '../chatPresentation';
import { AskVaultIcon } from './AskVaultIcon';

export function AgentOrb({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cx(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-[#7f7c7c] via-[#535353] to-[#202020] text-[#1b1b1b] shadow-[0_26px_52px_rgba(0,0,0,0.38)]',
        compact ? 'h-10 w-10' : 'h-24 w-24',
      )}
    >
      <div className="absolute inset-[10%] rounded-full bg-white/[0.08] blur-md" />
      <div className="absolute inset-[-10%] rounded-full bg-black/35 blur-2xl" />
      <AskVaultIcon
        name="brand"
        filled
        className={cx('relative z-10', compact ? 'h-[18px] w-[18px]' : 'h-9 w-9')}
      />
    </div>
  );
}
