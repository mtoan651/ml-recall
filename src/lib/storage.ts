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
import type { Difficulty } from "./types";

export const RESULTS_KEY = "ml-recall:results:v1";
export const SETTINGS_KEY = "ml-recall:settings:v1";
/** Test in progress for one topic or tag: `ml-recall:exam:v1:topic:cnn`. */
export const EXAM_KEY_PREFIX = "ml-recall:exam:v1:";
/** Scope (`topic:cnn`, `tag:softmax`, `mixed:custom`) → past tests. */
export const EXAM_HISTORY_KEY = "ml-recall:exam-history:v1";
/** Last choices on the mixed-test form (topics, difficulties, length). */
export const MIXED_KEY = "ml-recall:mixed:v1";

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

/**
 * Records several results at once (one read and one write), e.g. a submitted test. Each one is
 * also a spaced-repetition review (src/lib/srs.ts), recorded once the scheduler has loaded —
 * it is fetched on the first answer, so pages without answers never download it.
 */
export function saveResults(
  entries: Iterable<readonly [id: string, correct: boolean]>,
  store: KeyValueStore | null = browserStore(),
  now: number = Date.now(),
): Results {
  const graded = [...entries];
  const results = loadResults(store);
  for (const [id, correct] of graded) results[id] = { correct, at: now };
  writeJson(store, RESULTS_KEY, results);
  if (store && graded.length > 0) {
    import("./srs").then((srs) => srs.recordReviews(graded, now, store)).catch(() => {});
  }
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

/** Saves the test in progress. False when it could not be stored (no storage, quota). */
export function saveExam(state: ExamState, store: KeyValueStore | null = browserStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(examKey(state.scope), serializeExam(state));
    return true;
  } catch {
    // Quota exceeded or storage blocked: the test still runs, it just cannot be resumed.
    return false;
  }
}

/**
 * `startedAt` of the stored test of `scope`, without validating its questions, or null when
 * none is stored. Another tab that started, resumed or submitted the test changes it.
 */
export function storedExamStart(
  scope: string,
  store: KeyValueStore | null = browserStore(),
): number | null {
  const data = readJson(store, examKey(scope));
  if (typeof data !== "object" || data === null) return null;
  const { v, startedAt } = data as Record<string, unknown>;
  return v === EXAM_STATE_VERSION && typeof startedAt === "number" ? startedAt : null;
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

/** Every stored test history, by scope (scopes without a valid attempt are left out). */
export function loadAllExamHistory(
  store: KeyValueStore | null = browserStore(),
): Record<string, ExamHistory> {
  const out: Record<string, ExamHistory> = {};
  for (const [scope, raw] of Object.entries(loadAllHistory(store))) {
    const history = parseHistory(raw);
    if (history.attempts.length > 0 || history.best) out[scope] = history;
  }
  return out;
}

/**
 * Question ids of the stored test of `scope`, without validating them, or null when none is
 * stored. A mixed test page fetches these questions before it can resume the test.
 */
export function storedExamIds(
  scope: string,
  store: KeyValueStore | null = browserStore(),
): string[] | null {
  const data = readJson(store, examKey(scope));
  if (typeof data !== "object" || data === null) return null;
  const { v, items } = data as Record<string, unknown>;
  if (v !== EXAM_STATE_VERSION || !Array.isArray(items) || items.length === 0) return null;
  const ids = items.map((item) =>
    typeof item === "object" && item !== null ? (item as Record<string, unknown>).id : undefined,
  );
  return ids.every((id): id is string => typeof id === "string") ? ids : null;
}

// --------------------------------------------------------------------------- mixed tests

/** What the mixed-test form remembers. */
export interface MixedPrefs {
  topics: string[];
  /** Chosen tags; none means no tag filter. Absent in prefs stored before v0.4.1. */
  tags: string[];
  difficulties: Difficulty[];
  /** Questions per test. */
  size: number;
}

const isDifficulty = (v: unknown): v is Difficulty =>
  v === "easy" || v === "medium" || v === "hard";

/** The last mixed-test choices, or null when none are stored (or they are malformed). */
export function loadMixedPrefs(store: KeyValueStore | null = browserStore()): MixedPrefs | null {
  const data = readJson(store, MIXED_KEY);
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const { topics, tags, difficulties, size } = data as Record<string, unknown>;
  if (!Array.isArray(topics) || !Array.isArray(difficulties)) return null;
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) return null;
  const strings = (list: unknown[]) => [
    ...new Set(list.filter((t): t is string => typeof t === "string")),
  ];
  return {
    topics: strings(topics),
    tags: Array.isArray(tags) ? strings(tags) : [],
    difficulties: [...new Set(difficulties.filter(isDifficulty))],
    size,
  };
}

export function saveMixedPrefs(
  prefs: MixedPrefs,
  store: KeyValueStore | null = browserStore(),
): void {
  writeJson(store, MIXED_KEY, prefs);
}
