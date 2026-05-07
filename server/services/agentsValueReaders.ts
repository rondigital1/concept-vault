export function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${Math.round(value * 100)}%`;
}

export function formatCompactNumber(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function averageDurationMs(values: Array<number | null>): number | null {
  const durations = values.filter((value): value is number => typeof value === 'number');
  if (durations.length === 0) {
    return null;
  }

  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export function computeSuccessRate(statuses: string[]): number | null {
  const filtered = statuses.filter((status) => status === 'ok' || status === 'error' || status === 'partial');
  if (filtered.length === 0) {
    return null;
  }

  const successful = filtered.filter((status) => status === 'ok').length;
  return successful / filtered.length;
}
