import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Tiny per-request DB-timing accumulator for the `Server-Timing: db;dur=…`
 * header `withApi` (http.ts) adds to `/api/cms/*` responses, so slow queries
 * are measurable from a plain curl (`-w '%{time_total}'` for the wall clock,
 * this header for how much of it was actually spent in Postgres).
 *
 * `withDbTiming` starts the accumulator for the current request; `timeDb`
 * (used around every `pool.query` call in neon-store.ts) records it; it's a
 * no-op outside `withDbTiming` so calling `timeDb` from a script or a
 * non-timed route costs nothing extra.
 *
 * Tracked as the wall-clock span from the first query's start to the last
 * query's end, NOT a sum of individual durations: several routes (e.g.
 * `listCollections`) run queries concurrently via `Promise.all`, and summing
 * would double- (or triple-) count overlapping time, producing a `dur` that
 * can exceed the request's own total response time — a real bug caught while
 * verifying this (three ~160ms concurrent queries summed to ~490ms inside a
 * ~170ms response). The span approximates the true critical-path DB time:
 * for fully parallel queries it's close to the slowest one; for sequential
 * queries it's close to their sum.
 */
type TimingContext = { start?: number; end?: number };

const storage = new AsyncLocalStorage<TimingContext>();

export function withDbTiming<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({}, fn);
}

export async function timeDb<T>(fn: () => Promise<T>): Promise<T> {
  const context = storage.getStore();
  if (!context) {
    return fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const end = performance.now();
    context.start = context.start === undefined ? start : Math.min(context.start, start);
    context.end = context.end === undefined ? end : Math.max(context.end, end);
  }
}

/** Current request's DB-covered wall-clock span in ms, or `undefined` outside `withDbTiming` / when no query ran. */
export function getDbTimingMs(): number | undefined {
  const context = storage.getStore();
  if (!context || context.start === undefined || context.end === undefined) {
    return undefined;
  }
  return context.end - context.start;
}
