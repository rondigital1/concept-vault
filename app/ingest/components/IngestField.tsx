import type { ReactNode } from 'react';
import { monoLabelClass } from '../constants';

export function IngestField({
  label,
  children,
  optional,
}: {
  label: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-3">
      <span className={monoLabelClass}>
        {label}
        {optional ? ' / OPTIONAL' : ''}
      </span>
      {children}
    </label>
  );
}
