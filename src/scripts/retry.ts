export class RetryableError extends Error {
  retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.retryable = retryable;
  }
}

export type RetryOptions = {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: number;
  shouldRetry?: (error: unknown) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minDelayMs = 750,
    maxDelayMs = 8000,
    factor = 2,
    jitter = 0.2,
    shouldRetry = (error) =>
      error instanceof RetryableError ? error.retryable : true,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      const baseDelay = Math.min(minDelayMs * Math.pow(factor, attempt), maxDelayMs);
      const jitterAmount = baseDelay * jitter;
      const delay = baseDelay - jitterAmount + Math.random() * jitterAmount * 2;
      await sleep(Math.max(0, Math.round(delay)));
      attempt += 1;
    }
  }

  throw lastError;
}
