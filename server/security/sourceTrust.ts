import { logger } from '@/server/observability/logger';

export class BlockedSourceError extends Error {
  readonly reasonCode: string;
  readonly status: number;

  constructor(message: string, reasonCode: string, status = 422) {
    super(message);
    this.name = 'BlockedSourceError';
    this.reasonCode = reasonCode;
    this.status = status;
  }
}

export interface SourceTrustDecision {
  allowed: boolean;
  context: string;
  domain: string;
  matchedSignals: string[];
  reasonCode?: string;
  reason?: string;
  url: string;
}

interface SourceTrustInput {
  content?: string;
  context: string;
  snippet?: string;
  title?: string;
  trustedDomains?: string[];
  url: string;
}

const DEFAULT_BLOCKED_DOMAINS = [
  'bit.ly',
  'buff.ly',
  'goo.gl',
  'is.gd',
  'lnkd.in',
  'ow.ly',
  'rebrand.ly',
  't.co',
  'tiny.one',
  'tinyurl.com',
] as const;

const PROMPT_INJECTION_RULES = [
  {
    code: 'ignore_instructions',
    pattern: /\b(ignore|disregard)\s+(all\s+)?(previous|prior|above|earlier)\s+instructions\b/i,
  },
  {
    code: 'override_system_prompt',
    pattern: /\b(system prompt|developer message|hidden instructions?)\b/i,
  },
  {
    code: 'act_as_assistant',
    pattern: /\byou are (chatgpt|an ai assistant|the assistant)\b/i,
  },
  {
    code: 'tool_or_secret_exfiltration',
    pattern: /\b(exfiltrate|reveal|expose|leak)\b.{0,40}\b(secret|credential|token|prompt)\b/i,
  },
] as const;

const blockedSourceCounters = new Map<string, number>();

function counterKey(context: string, reasonCode: string): string {
  return `${context}:${reasonCode}`;
}

function normalizeDomainRule(rule: string): string {
  return rule.trim().toLowerCase().replace(/^\*\./, '');
}

function normalizeDomain(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function domainMatchesRule(domain: string, rule: string): boolean {
  const normalizedRule = normalizeDomainRule(rule);
  return domain === normalizedRule || domain.endsWith(`.${normalizedRule}`);
}

function parseDomainList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => normalizeDomainRule(entry))
    .filter(Boolean);
}

function getBlockedDomains(env: NodeJS.ProcessEnv = process.env): string[] {
  return [...DEFAULT_BLOCKED_DOMAINS, ...parseDomainList(env.SOURCE_POLICY_BLOCKED_DOMAINS)];
}

function findBlockedDomain(domain: string, blockedDomains: string[]): string | null {
  for (const rule of blockedDomains) {
    if (domainMatchesRule(domain, rule)) {
      return rule;
    }
  }

  return null;
}

function findPromptInjectionSignals(text: string): string[] {
  const matches = new Set<string>();
  for (const rule of PROMPT_INJECTION_RULES) {
    if (rule.pattern.test(text)) {
      matches.add(rule.code);
    }
  }
  return [...matches];
}

function incrementBlockedSourceCounter(context: string, reasonCode: string): number {
  const key = counterKey(context, reasonCode);
  const next = (blockedSourceCounters.get(key) ?? 0) + 1;
  blockedSourceCounters.set(key, next);
  return next;
}

function buildSourceTextSample(params: SourceTrustInput): string {
  return [params.title ?? '', params.snippet ?? '', params.content?.slice(0, 2_000) ?? '']
    .filter(Boolean)
    .join('\n\n');
}

function logBlockedSource(decision: SourceTrustDecision): void {
  const counter = incrementBlockedSourceCounter(
    decision.context,
    decision.reasonCode ?? 'blocked_source',
  );
  logger.warn('source.blocked', {
    auditCount: counter,
    context: decision.context,
    domain: decision.domain,
    matchedSignals: decision.matchedSignals,
    reason: decision.reason,
    reasonCode: decision.reasonCode,
    url: decision.url,
  });
}

export function assessSourceTrust(
  params: SourceTrustInput,
  env: NodeJS.ProcessEnv = process.env,
): SourceTrustDecision {
  const parsed = new URL(params.url);
  const domain = normalizeDomain(parsed.hostname);
  const blockedDomain = findBlockedDomain(domain, getBlockedDomains(env));
  if (blockedDomain) {
    return {
      allowed: false,
      context: params.context,
      domain,
      matchedSignals: [],
      reasonCode: 'blocked_domain',
      reason: `Blocked domain policy matched ${blockedDomain}`,
      url: params.url,
    };
  }

  if (params.trustedDomains && params.trustedDomains.length > 0) {
    const allowed = params.trustedDomains.some((rule) => domainMatchesRule(domain, rule));
    if (!allowed) {
      return {
        allowed: false,
        context: params.context,
        domain,
        matchedSignals: [],
        reasonCode: 'untrusted_domain',
        reason: 'Domain is outside the trusted source set',
        url: params.url,
      };
    }
  }

  const matchedSignals = findPromptInjectionSignals(buildSourceTextSample(params));
  if (matchedSignals.length > 0) {
    return {
      allowed: false,
      context: params.context,
      domain,
      matchedSignals,
      reasonCode: 'prompt_injection_signals',
      reason: 'Prompt-injection style instructions detected in external content',
      url: params.url,
    };
  }

  return {
    allowed: true,
    context: params.context,
    domain,
    matchedSignals: [],
    url: params.url,
  };
}

export function assertTrustedSource(
  params: SourceTrustInput,
  env: NodeJS.ProcessEnv = process.env,
): SourceTrustDecision {
  const decision = assessSourceTrust(params, env);
  if (!decision.allowed) {
    logBlockedSource(decision);
    throw new BlockedSourceError(
      decision.reason ?? 'Blocked by source trust policy',
      decision.reasonCode ?? 'blocked_source',
    );
  }

  return decision;
}

export function sanitizeExternalTextForPrompt(text: string): {
  matchedSignals: string[];
  sanitizedText: string;
} {
  const matchedSignals = findPromptInjectionSignals(text);
  if (matchedSignals.length === 0) {
    return { matchedSignals, sanitizedText: text };
  }

  return {
    matchedSignals,
    sanitizedText: '[external text removed by source trust policy]',
  };
}

export function getBlockedSourceAuditCount(context: string, reasonCode: string): number {
  return blockedSourceCounters.get(counterKey(context, reasonCode)) ?? 0;
}

export function resetBlockedSourceAudit(): void {
  blockedSourceCounters.clear();
}
