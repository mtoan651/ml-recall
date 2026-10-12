/**
 * The few spaced-repetition facts that pages need without loading the scheduler: where cards
 * are stored, when "today" ends, and how many cards are due (the nav badge).
 */
import type { KeyValueStore } from "./storage";

export const SRS_KEY = "ml-recall:srs:v1";
/** Window event fired after cards are saved, so due-count badges can refresh. */
export const SRS_EVENT = "ml-recall:srs";

/** Start of the local day after `now` — a card due before it is due today. */
export function endOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Number of stored cards due today or earlier (their first tuple field is the due time). */
export function countDue(store: KeyValueStore | null, now: number = Date.now()): number {
  if (!store) return 0;
  try {
    const raw = store.getItem(SRS_KEY);
    const data: unknown = raw === null ? null : JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return 0;
    const limit = endOfDay(now);
    return Object.values(data).filter(
      (v) => Array.isArray(v) && typeof v[0] === "number" && v[0] < limit,
    ).length;
  } catch {
    return 0;
  }
}
