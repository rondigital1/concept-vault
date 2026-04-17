import { NextResponse } from 'next/server';
import { z } from 'zod';

export type ValidationErrorDetail = {
  path: string;
  message: string;
  code: string;
};

type ValidationFailureMetric = {
  route: string;
  method: string;
};

const validationFailureCounters = new Map<string, number>();

function metricKey(metric: ValidationFailureMetric): string {
  return `${metric.method}:${metric.route}`;
}

function formatIssuePath(path: Array<string | number>): string {
  if (path.length === 0) {
    return '$';
  }

  return path.map(String).join('.');
}

function incrementValidationFailure(metric: ValidationFailureMetric): number {
  const key = metricKey(metric);
  const nextCount = (validationFailureCounters.get(key) ?? 0) + 1;
  validationFailureCounters.set(key, nextCount);
  return nextCount;
}

function recordValidationFailure(params: ValidationFailureMetric & {
  contentType: string | null;
  details: ValidationErrorDetail[];
}): void {
  const failureCount = incrementValidationFailure(params);
  const issueSummary = params.details
    .map((detail) => `${detail.path}:${detail.message}`)
    .join(' | ');

  console.warn(
    `[validation] route=${params.route} method=${params.method} contentType=${params.contentType ?? 'unknown'} failureCount=${failureCount} details=${issueSummary}`,
  );
}

function makeValidationDetails(error: z.ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
    code: issue.code,
  }));
}

function invalidJsonDetails(): ValidationErrorDetail[] {
  return [
    {
      path: '$',
      message: 'Request body must be valid JSON',
      code: 'invalid_json',
    },
  ];
}

export class RequestValidationError extends Error {
  readonly details: ValidationErrorDetail[];
  readonly route: string;
  readonly method: string;
  readonly contentType: string | null;
  readonly status = 400;

  constructor(params: {
    route: string;
    method: string;
    contentType: string | null;
    details: ValidationErrorDetail[];
  }) {
    super('Invalid request payload');
    this.name = 'RequestValidationError';
    this.route = params.route;
    this.method = params.method;
    this.contentType = params.contentType;
    this.details = params.details;
    recordValidationFailure(params);
  }
}

function makeRequestValidationError(params: {
  request: Request;
  route: string;
  details: ValidationErrorDetail[];
}): RequestValidationError {
  return new RequestValidationError({
    route: params.route,
    method: params.request.method,
    contentType: params.request.headers.get('content-type'),
    details: params.details,
  });
}

function validateParsedBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  route: string,
  schema: TSchema,
  payload: unknown,
): z.infer<TSchema> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw makeRequestValidationError({
      request,
      route,
      details: makeValidationDetails(parsed.error),
    });
  }

  return parsed.data;
}

export function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

export function isFormRequest(contentType: string): boolean {
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

export function formString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === 'string' ? value : undefined;
}

export function parseBooleanFlag(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (['true', '1', 'on', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function parseNumberFromForm(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function parseJsonRequest<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  options: {
    route: string;
    allowEmptyObject?: boolean;
  },
): Promise<z.infer<TSchema>> {
  const raw = await request.text();

  if (!raw.trim()) {
    if (options.allowEmptyObject) {
      return validateParsedBody(request, options.route, schema, {});
    }

    throw makeRequestValidationError({
      request,
      route: options.route,
      details: invalidJsonDetails(),
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw makeRequestValidationError({
      request,
      route: options.route,
      details: invalidJsonDetails(),
    });
  }

  return validateParsedBody(request, options.route, schema, payload);
}

export async function parseFormRequest<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  options: {
    route: string;
    mapFormData: (form: FormData) => unknown;
  },
): Promise<z.infer<TSchema>> {
  const form = await request.formData();
  return validateParsedBody(request, options.route, schema, options.mapFormData(form));
}

export function validationErrorResponse(error: RequestValidationError): NextResponse {
  return NextResponse.json(
    {
      error: 'Invalid request payload',
      details: error.details,
    },
    { status: error.status },
  );
}

export function getValidationFailureCount(route: string, method = 'POST'): number {
  return validationFailureCounters.get(metricKey({ route, method })) ?? 0;
}

export function resetValidationFailureCounts(): void {
  validationFailureCounters.clear();
}
