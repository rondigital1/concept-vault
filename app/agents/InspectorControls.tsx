'use client';

import { useId } from 'react';
import {
  workspaceEyebrowClassName,
  workspaceInputClassName,
  workspaceInsetSurfaceClassName,
  workspaceLabelClassName,
  workspaceMutedCopyClassName,
} from './workspaceTheme';

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className={`${workspaceInsetSurfaceClassName} flex items-start justify-between gap-4 px-4 py-4`}>
      <div className="min-w-0">
        <div id={labelId} className="text-sm font-medium text-white">
          {label}
        </div>
        {description ? (
          <p id={descriptionId} className={`mt-1 ${workspaceMutedCopyClassName}`}>
            {description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-7 w-14 shrink-0 rounded-full transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]',
          checked ? 'bg-[color:var(--surface-accent-ink)]' : 'bg-white/[0.12]',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-8' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className={workspaceLabelClassName}>{label}</span>
      <input
        type="number"
        inputMode={step && step < 1 ? 'decimal' : 'numeric'}
        className={workspaceInputClassName}
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (!Number.isNaN(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </label>
  );
}

export function ActionRow({
  eyebrow,
  title,
  actionLabel,
  actionClassName,
  disabled,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  actionClassName: string;
  disabled: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={workspaceEyebrowClassName}>{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">{title}</h2>
      </div>
      <button type="button" className={actionClassName} onClick={onAction} disabled={disabled}>
        {actionLabel}
      </button>
    </div>
  );
}

export function ResultsMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
      <div className="text-2xl font-semibold tracking-normal text-white">{value}</div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
        {label}
      </div>
    </div>
  );
}
