/**
 * Error thrown when a network-dependent operation is attempted while offline.
 * Callers can check `instanceof OfflineError` for specific handling.
 */
export class OfflineError extends Error {
  constructor(message = 'You are offline. This action requires a network connection.') {
    super(message)
    this.name = 'OfflineError'
  }
}

/**
 * Pre-flight check that throws OfflineError when the browser reports no network.
 *
 * Uses `navigator.onLine` as a synchronous, zero-latency heuristic.
 * It can produce false positives (captive portals report online) but never
 * false negatives in modern browsers. The subsequent `fetch` will still fail
 * on captive portals, and existing callers already handle that with toast.error.
 *
 * Only use this before Edge Function / Supabase client calls.
 * Do NOT use before PowerSync reads/writes (those work offline).
 */
export function assertOnline(): void {
  if (!navigator.onLine) {
    throw new OfflineError()
  }
}
