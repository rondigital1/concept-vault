import type { QualityGateFailure } from '@/server/ai/quality-gates';

export class AIExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIExecutionError';
  }
}

export class AIBudgetExceededError extends AIExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'AIBudgetExceededError';
  }
}

export class AIValidationError extends AIExecutionError {
  readonly failure: QualityGateFailure;

  constructor(failure: QualityGateFailure) {
    super(failure.message);
    this.failure = failure;
    this.name = 'AIValidationError';
  }
}
