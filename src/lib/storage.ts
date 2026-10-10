/**
 * Progress in the browser's localStorage, keyed by question id (ids are permanent — see
 * docs/conventions.md#ids-are-forever). Every access is wrapped: storage may be missing,
 * full, or blocked (private windows), and the app must keep working without it.
 *
 * Changing the stored format is a breaking change: bump the key version and migrate.
 */

import {
  addAttempt,
  DEFAULT_EXAM_LAYOUT,
  EMPTY_HISTORY,
  EXAM_STATE_VERSION,
  type ExamAttempt,
  type ExamHistory,
  type ExamLayout,
  type ExamState,
  isExamLayout,
  parseExam,
  parseHistory,
  remainingMs,
  type StoredQuestionInfo,
  serializeExam,
} from "./exam";

export const RESULTS_KEY = "ml-recall:results:v1";
export const SETTINGS_KEY = "ml-recall:settings:v1";
/** Test in progress for one topic or tag: `ml-recall:exam:v1:topic:cnn`. */
export const EXAM_KEY_PREFIX = "ml-recall:exam:v1:";
/** Scope (`topic:cnn`, `tag:softmax`) → past tests. */
export const EXAM_HISTORY_KEY = "ml-recall:exam-history:v1";

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
  /** Hide `draft` questions (practice and tests). */
  reviewedOnly: boolean;
  /** Timed tests: one question at a time, or all on one page. */
  examLayout: ExamLayout;
}

export const DEFAULT_SETTINGS: QuizSettings = {
  shuffleQuestions: true,
  reviewedOnly: false,
  examLayout: DEFAULT_EXAM_LAYOUT,
};

/** The subset of the Web Storage API we use (lets tests pass an in-memory store). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
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
  return saveResults([[id, correct]], store, now);
}

/** Records several results at once (one read and one write), e.g. a submitted test. */
export function saveResults(
  entries: Iterable<readonly [id: string, correct: boolean]>,
  store: KeyValueStore | null = browserStore(),
  now: number = Date.now(),
): Results {
  const results = loadResults(store);
  for (const [id, correct] of entries) results[id] = { correct, at: now };
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
    // Added in v0.3: settings saved before have no layout and get the default.
    examLayout: isExamLayout(s.examLayout) ? s.examLayout : DEFAULT_SETTINGS.examLayout,
  };
}

export function saveSettings(
  settings: QuizSettings,
  store: KeyValueStore | null = browserStore(),
): void {
  writeJson(store, SETTINGS_KEY, settings);
}

// --------------------------------------------------------------------------- timed tests

export const examKey = (scope: string): string => `${EXAM_KEY_PREFIX}${scope}`;

/** The test in progress for `scope`, or null if there is none or it cannot be resumed. */
export function loadExam(
  scope: string,
  questions: ReadonlyMap<string, StoredQuestionInfo>,
  store: KeyValueStore | null = browserStore(),
): ExamState | null {
  return parseExam(readJson(store, examKey(scope)), scope, questions);
}

export function saveExam(state: ExamState, store: KeyValueStore | null = browserStore()): void {
  if (!store) return;
  try {
    store.setItem(examKey(state.scope), serializeExam(state));
  } catch {
    // Quota exceeded or storage blocked: the test still runs, it just cannot be resumed.
  }
}

export function clearExam(scope: string, store: KeyValueStore | null = browserStore()): void {
  if (!store) return;
  try {
    store.removeItem(examKey(scope));
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/**
 * Time left on the stored test of `scope`, without validating its questions (for links such
 * as "Resume test" on the topic page). Null when there is no running test.
 */
export function examTimeLeft(
  scope: string,
  store: KeyValueStore | null = browserStore(),
  now: number = Date.now(),
): number | null {
  const data = readJson(store, examKey(scope));
  if (typeof data !== "object" || data === null) return null;
  const { v, startedAt, durationMs } = data as Record<string, unknown>;
  if (v !== EXAM_STATE_VERSION) return null;
  if (typeof startedAt !== "number" || typeof durationMs !== "number") return null;
  const left = remainingMs(startedAt, durationMs, now);
  return Number.isFinite(left) && left > 0 ? left : null;
}

function loadAllHistory(store: KeyValueStore | null): Record<string, unknown> {
  const data = readJson(store, EXAM_HISTORY_KEY);
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export function loadExamHistory(
  scope: string,
  store: KeyValueStore | null = browserStore(),
): ExamHistory {
  const raw = loadAllHistory(store)[scope];
  return raw === undefined ? EMPTY_HISTORY : parseHistory(raw);
}

/** Adds a finished test to the history of `scope` and returns the updated history. */
export function saveExamAttempt(
  scope: string,
  attempt: ExamAttempt,
  store: KeyValueStore | null = browserStore(),
): ExamHistory {
  const all = loadAllHistory(store);
  const history = addAttempt(parseHistory(all[scope]), attempt);
  writeJson(store, EXAM_HISTORY_KEY, { ...all, [scope]: history });
  return history;
}
