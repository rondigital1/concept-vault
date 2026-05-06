import { StatusBadge } from '@/app/components/StatusBadge';
import { sectionLabelClass } from '@/app/today/WorkspaceHeaderPrimitives';
import { insetPanelClass } from '../styles';
import type { StageProgress } from '../types';

export function StageBadge({ stage }: { stage: StageProgress }) {
  return (
    <StatusBadge
      status={stage.status}
      label={stage.label}
      className="!px-3 !py-1 !text-xs !font-medium"
    />
  );
}

export function OutcomeCountCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className={`${insetPanelClass} p-4`}>
      <p className={sectionLabelClass}>{label}</p>
      <p className="mt-2 break-all text-2xl font-semibold text-[color:var(--today-text)]">{value}</p>
      <p className="mt-1 text-xs text-[color:var(--today-muted)]">{hint}</p>
    </div>
  );
}
