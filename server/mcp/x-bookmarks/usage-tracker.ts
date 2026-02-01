import * as fs from 'fs';
import * as path from 'path';

const MONTHLY_LIMIT = 100;
const USAGE_FILE = path.join(process.cwd(), '.x-api-usage.json');

interface UsageData {
  month: string;
  readsUsed: number;
  lastFetchDate: string | null;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function loadUsage(): UsageData {
  const currentMonth = getCurrentMonth();

  if (!fs.existsSync(USAGE_FILE)) {
    return { month: currentMonth, readsUsed: 0, lastFetchDate: null };
  }

  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')) as UsageData;
    // Reset if new month
    if (data.month !== currentMonth) {
      return { month: currentMonth, readsUsed: 0, lastFetchDate: null };
    }
    return data;
  } catch {
    return { month: currentMonth, readsUsed: 0, lastFetchDate: null };
  }
}

function saveUsage(data: UsageData): void {
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
}

export function recordRead(): void {
  const usage = loadUsage();
  usage.readsUsed += 1;
  usage.lastFetchDate = new Date().toISOString();
  saveUsage(usage);
}

export function getUsage(): {
  estimatedReadsUsed: number;
  estimatedReadsRemaining: number;
  monthlyLimit: number;
  lastFetchDate: string | null;
  currentMonth: string;
} {
  const usage = loadUsage();
  return {
    estimatedReadsUsed: usage.readsUsed,
    estimatedReadsRemaining: Math.max(0, MONTHLY_LIMIT - usage.readsUsed),
    monthlyLimit: MONTHLY_LIMIT,
    lastFetchDate: usage.lastFetchDate,
    currentMonth: usage.month,
  };
}

export function hasQuotaRemaining(): boolean {
  const usage = loadUsage();
  return usage.readsUsed < MONTHLY_LIMIT;
}
