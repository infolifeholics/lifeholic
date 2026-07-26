/**
 * Exponential backoff retry delay schedule for QStash.
 * Returns delay in seconds for each attempt number (0-indexed).
 */
export const RETRY_DELAYS_SECONDS = [
  60,      // Attempt 1 → 1 minute
  300,     // Attempt 2 → 5 minutes
  900,     // Attempt 3 → 15 minutes
  1800,    // Attempt 4 → 30 minutes
  3600,    // Attempt 5 → 60 minutes
] as const;

export const MAX_RETRY_ATTEMPTS = RETRY_DELAYS_SECONDS.length;

/**
 * Returns the delay in seconds for the given retry attempt.
 * Returns null if max retries exceeded (should go to DLQ).
 */
export function getRetryDelay(attempt: number): number | null {
  if (attempt >= MAX_RETRY_ATTEMPTS) return null;
  return RETRY_DELAYS_SECONDS[attempt];
}

/**
 * Formats a delay in seconds to a human-readable string.
 */
export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60}m`;
  return `${seconds / 3600}h`;
}
