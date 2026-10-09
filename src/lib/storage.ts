/**
 * Progress in the browser's localStorage, keyed by question id (ids are permanent — see
 * docs/conventions.md#ids-are-forever). Every access is wrapped: storage may be missing,
 * full, or blocked (private windows), and the app must keep working without it.
 *
 * Changing the stored format is a breaking change: bump the key version and migrate.
 */

export const RESULTS_KEY = "ml-recall:results:v1";
export const SETTINGS_KEY = "ml-recall:settings:v1";

/** Last result of one question. */
export interface QuestionResult {
  correct: boolean;
  /** When it was answered, in epoch milliseconds. */
  at: number;
}

export type Results = Record<string, QuestionResult>;

export interface QuizSettings {
  /** Shuffle question order (otherwise file order). */
  shuffleQuestions: boolean;
  /** Hide `draft` questions. */
  reviewedOnly: boolean;
}

export const DEFAULT_SETTINGS: QuizSettings = { shuffleQuestions: true, reviewedOnly: false };

/** The subset of the Web Storage API we use (lets tests pass an in-memory store). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** `window.localStorage`, or null when unavailable (SSR, blocked storage). */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readJson(store: KeyValueStore | null, key: string): unknown {
  if (!store) return undefined;
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(store: KeyValueStore | null, key: string, value: unknown): void {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked: progress is a convenience, keep going.
  }
}

function isResult(value: unknown): value is QuestionResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.correct === "boolean" && typeof r.at === "number";
}

/** All stored results; malformed entries are dropped. */
export function loadResults(store: KeyValueStore | null = browserStore()): Results {
  const data = readJson(store, RESULTS_KEY);
  if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
  const results: Results = {};
  for (const [id, value] of Object.entries(data)) {
    if (isResult(value)) results[id] = { correct: value.correct, at: value.at };
  }
  return results;
}

/** Records the latest result of question `id` and returns the updated results. */
export function saveResult(
  id: string,
  correct: boolean,
  store: KeyValueStore | null = browserStore(),
  now: number = Date.now(),
): Results {
  const results = { ...loadResults(store), [id]: { correct, at: now } };
  writeJson(store, RESULTS_KEY, results);
  return results;
}

/** How many of `ids` have a stored result, and how many of those were correct. */
export function summarize(
  results: Results,
  ids: readonly string[],
): { answered: number; correct: number } {
  let answered = 0;
  let correct = 0;
  for (const id of ids) {
    const r = results[id];
    if (!r) continue;
    answered++;
    if (r.correct) correct++;
  }
  return { answered, correct };
}

export function loadSettings(store: KeyValueStore | null = browserStore()): QuizSettings {
  const data = readJson(store, SETTINGS_KEY);
  const s = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  return {
    shuffleQuestions:
      typeof s.shuffleQuestions === "boolean"
        ? s.shuffleQuestions
        : DEFAULT_SETTINGS.shuffleQuestions,
    reviewedOnly:
      typeof s.reviewedOnly === "boolean" ? s.reviewedOnly : DEFAULT_SETTINGS.reviewedOnly,
  };
}

export function saveSettings(
  settings: QuizSettings,
  store: KeyValueStore | null = browserStore(),
): void {
  writeJson(store, SETTINGS_KEY, settings);
}
