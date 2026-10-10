/**
 * Timed tests ("exam mode", docs/web-app.md#timed-tests): N random questions of one topic or
 * tag in N minutes, no feedback until the test is submitted. Pure logic only — the island
 * (src/components/Exam.tsx) renders and dispatches, src/lib/storage.ts reads and writes.
 */
import { gradeChoice, gradeShortAnswer, isAutoGraded, type ShortAnswerKey } from "./grading";
import { type SessionInput, type SessionItem, toggleOption } from "./session";
import { order, type Rng, shuffled } from "./shuffle";
import type { QuestionType } from "./types";

/** At most this many questions per test. */
export const EXAM_MAX_QUESTIONS = 20;
/** Time allowed per question: a test of N questions lasts N minutes. */
export const EXAM_MS_PER_QUESTION = 60_000;
/** Attempts kept per topic or tag (the best one is kept separately). */
export const EXAM_HISTORY_LIMIT = 10;
/** The countdown turns amber at 5:00 and red at 1:00 (as displayed). */
export const EXAM_WARNING_SECONDS = 5 * 60;
export const EXAM_CRITICAL_SECONDS = 60;
/** Longest stored short answer; longer stored text is cut (nobody types more in a test). */
const MAX_TEXT_LENGTH = 2000;

// --------------------------------------------------------------------------- pool and size

/** What eligibility needs to know about a question (`QuizQuestion` and schema questions fit). */
export interface EligibilityInput {
  type: QuestionType;
  answer?: ShortAnswerKey | null | undefined;
}

/**
 * Whether a question can be in a test: every choice question, and short answers with `accept`
 * or `numeric`. Open short answers (model answer only) need self-grading, which a test with
 * feedback at the end cannot ask for, so they stay practice-only.
 */
export function isExamEligible(q: EligibilityInput): boolean {
  if (q.type !== "short_answer") return true;
  return Boolean(q.answer && isAutoGraded(q.answer));
}

/** The questions a test draws from: eligible ones, only `reviewed` ones if asked. */
export function examPool<T extends EligibilityInput & { status: string }>(
  questions: readonly T[],
  reviewedOnly: boolean,
): T[] {
  return questions.filter((q) => isExamEligible(q) && (!reviewedOnly || q.status === "reviewed"));
}

export interface ExamPlan {
  /** Questions in the pool. */
  available: number;
  /** Questions in the test: min(max, available). */
  count: number;
  /** Time limit in milliseconds: one minute per question. */
  durationMs: number;
  /** True when the pool is smaller than a full test, so the test is shorter. */
  short: boolean;
}

export function planExam(available: number, max: number = EXAM_MAX_QUESTIONS): ExamPlan {
  const count = Math.max(0, Math.min(max, available));
  return { available, count, durationMs: count * EXAM_MS_PER_QUESTION, short: available < max };
}

/**
 * Picks the questions of a new test: a uniformly random subset of `max` questions in random
 * order, each with its option order (shuffled unless the question keeps file order).
 */
export function selectExamItems(
  pool: readonly SessionInput[],
  rng: Rng = Math.random,
  max: number = EXAM_MAX_QUESTIONS,
): SessionItem[] {
  return shuffled(pool, rng)
    .slice(0, max)
    .map((q) => ({ id: q.id, optionOrder: order(q.optionCount, q.shuffleOptions, rng) }));
}

// --------------------------------------------------------------------------- state

/** The learner's answer to one question (no outcome: nothing is graded before submitting). */
export interface ExamAnswer {
  /** Selected options, as original option indexes. */
  selected: number[];
  /** Typed short answer. */
  text: string;
}

/** A test in progress. Everything needed to resume it after a reload is in here. */
export interface ExamState {
  /** What the test is about: `topic:<id>` or `tag:<tag>` (see `examScope`). */
  scope: string;
  items: SessionItem[];
  answers: Record<string, ExamAnswer>;
  /** Ids flagged for review, in the order they were flagged. */
  flagged: string[];
  /** Index into `items` of the question on screen. */
  position: number;
  /** Epoch milliseconds when the test started; the timer is derived from it. */
  startedAt: number;
  durationMs: number;
  reviewedOnly: boolean;
}

export type ScopeKind = "topic" | "tag";

/** Storage scope of a topic or tag. Prefixed: a topic and a tag may share a name (`pytorch`). */
export function examScope(kind: ScopeKind, id: string): string {
  return `${kind}:${id}`;
}

export interface CreateExamOptions {
  scope: string;
  reviewedOnly: boolean;
  /** Start time in epoch milliseconds. */
  now: number;
  rng?: Rng;
  max?: number;
}

/** A new test over `pool` (already filtered with `examPool`). */
export function createExam(pool: readonly SessionInput[], options: CreateExamOptions): ExamState {
  const items = selectExamItems(pool, options.rng, options.max);
  return {
    scope: options.scope,
    items,
    answers: {},
    flagged: [],
    position: 0,
    startedAt: options.now,
    durationMs: items.length * EXAM_MS_PER_QUESTION,
    reviewedOnly: options.reviewedOnly,
  };
}

export const EMPTY_EXAM_ANSWER: ExamAnswer = { selected: [], text: "" };

export function examAnswerOf(state: ExamState, id: string): ExamAnswer {
  return state.answers[id] ?? EMPTY_EXAM_ANSWER;
}

export function currentExamItem(state: ExamState): SessionItem | undefined {
  return state.items[state.position];
}

/** Answered = an option is selected or some text is typed. */
export function isAnswered(answer: ExamAnswer | undefined): boolean {
  return Boolean(answer && (answer.selected.length > 0 || answer.text.trim() !== ""));
}

export function answeredCount(state: ExamState): number {
  return state.items.filter(({ id }) => isAnswered(state.answers[id])).length;
}

export function unansweredCount(state: ExamState): number {
  return state.items.length - answeredCount(state);
}

export type ExamAction =
  /** Select an option (original index) of the current question; toggles for multiple. */
  | { type: "select"; option: number; multiple: boolean }
  | { type: "type"; text: string }
  | { type: "toggleFlag" }
  | { type: "goto"; position: number }
  | { type: "next" }
  | { type: "previous" };

export function examReducer(state: ExamState, action: ExamAction): ExamState {
  const item = currentExamItem(state);
  switch (action.type) {
    case "select": {
      if (!item) return state;
      const answer = examAnswerOf(state, item.id);
      const selected = toggleOption(answer.selected, action.option, action.multiple);
      return { ...state, answers: { ...state.answers, [item.id]: { ...answer, selected } } };
    }
    case "type": {
      if (!item) return state;
      const answer = examAnswerOf(state, item.id);
      return {
        ...state,
        answers: { ...state.answers, [item.id]: { ...answer, text: action.text } },
      };
    }
    case "toggleFlag": {
      if (!item) return state;
      const flagged = state.flagged.includes(item.id)
        ? state.flagged.filter((id) => id !== item.id)
        : [...state.flagged, item.id];
      return { ...state, flagged };
    }
    case "goto":
      return moveTo(state, action.position);
    case "next":
      return moveTo(state, state.position + 1);
    case "previous":
      return moveTo(state, state.position - 1);
  }
}

function moveTo(state: ExamState, position: number): ExamState {
  if (!Number.isInteger(position) || position < 0 || position >= state.items.length) return state;
  return position === state.position ? state : { ...state, position };
}

// --------------------------------------------------------------------------- timer

/** Milliseconds left, from the start timestamp — correct after the tab slept or reloaded. */
export function remainingMs(startedAt: number, durationMs: number, now: number): number {
  // Clamped both ways: a clock set back before the start must not add time.
  return Math.min(durationMs, Math.max(0, startedAt + durationMs - now));
}

export function isExpired(state: Pick<ExamState, "startedAt" | "durationMs">, now: number) {
  return remainingMs(state.startedAt, state.durationMs, now) === 0;
}

/** Time spent on a test that ended at `finishedAt` (never more than the limit). */
export function timeUsedMs(startedAt: number, durationMs: number, finishedAt: number): number {
  return Math.min(durationMs, Math.max(0, finishedAt - startedAt));
}

/**
 * `mm:ss`. Countdowns round up (`"ceil"`): the clock shows 20:00 at the start and 00:00 only
 * when time is up. Elapsed times round down (`"floor"`).
 */
export function formatClock(ms: number, rounding: "ceil" | "floor" = "ceil"): string {
  const seconds = Math[rounding](Math.max(0, ms) / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export type TimerLevel = "normal" | "warning" | "critical";

/** Countdown colour, from the displayed seconds: amber at ≤ 5:00, red at ≤ 1:00. */
export function timerLevel(ms: number): TimerLevel {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  if (seconds <= EXAM_CRITICAL_SECONDS) return "critical";
  if (seconds <= EXAM_WARNING_SECONDS) return "warning";
  return "normal";
}

const SEVERITY: Record<TimerLevel, number> = { normal: 0, warning: 1, critical: 2 };

/**
 * What to tell screen readers when the countdown moves from `previousMs` to `currentMs`: a
 * message only when it crosses into amber or red (not every second), null otherwise. After a
 * jump (the tab slept) it says the actual time left.
 */
export function timerAnnouncement(previousMs: number, currentMs: number): string | null {
  const level = timerLevel(currentMs);
  if (SEVERITY[level] <= SEVERITY[timerLevel(previousMs)] || currentMs <= 0) return null;
  const seconds = Math.ceil(currentMs / 1000);
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} left.`;
  }
  return `${seconds} ${seconds === 1 ? "second" : "seconds"} left.`;
}

// --------------------------------------------------------------------------- scoring

export type ExamOutcome = "correct" | "incorrect" | "unanswered";

/** What grading needs to know about a question (`QuizQuestion` fits). */
export interface GradingInput {
  type: QuestionType;
  options?: readonly { correct: boolean }[];
  answer?: ShortAnswerKey;
}

/**
 * Grades one answer with the practice rules (src/lib/grading.ts): choice questions are
 * all-or-nothing, short answers match `accept` / `numeric`. Text that is not a number for a
 * numeric-only key is wrong (a test cannot ask again).
 */
export function gradeExamAnswer(q: GradingInput, answer: ExamAnswer | undefined): ExamOutcome {
  if (!answer || !isAnswered(answer)) return "unanswered";
  if (q.options) {
    if (answer.selected.length === 0) return "unanswered";
    const { correct } = gradeChoice(
      q.options.map((o) => o.correct),
      answer.selected,
    );
    return correct ? "correct" : "incorrect";
  }
  if (!q.answer) return "incorrect";
  const result = gradeShortAnswer(answer.text, q.answer);
  if (result.kind === "empty") return "unanswered";
  return result.kind === "graded" && result.correct ? "correct" : "incorrect";
}

export interface ExamScore {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  /** Rounded percentage of `total`. */
  percent: number;
  outcomes: Record<string, ExamOutcome>;
}

export function scoreExam(
  state: Pick<ExamState, "items" | "answers">,
  questions: ReadonlyMap<string, GradingInput>,
): ExamScore {
  const outcomes: Record<string, ExamOutcome> = {};
  const counts = { correct: 0, incorrect: 0, unanswered: 0 };
  for (const { id } of state.items) {
    const q = questions.get(id);
    const outcome = q ? gradeExamAnswer(q, state.answers[id]) : "unanswered";
    outcomes[id] = outcome;
    counts[outcome]++;
  }
  const total = state.items.length;
  return { total, ...counts, percent: percentOf(counts.correct, total), outcomes };
}

export function percentOf(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

// --------------------------------------------------------------------------- persistence

/** Bump when the stored shape changes; older stored tests are then discarded. */
export const EXAM_STATE_VERSION = 1;

/** The stored form of a test in progress. */
export function serializeExam(state: ExamState): string {
  return JSON.stringify({ v: EXAM_STATE_VERSION, ...state });
}

/** What validation needs to know about each question of the current page. */
export interface StoredQuestionInfo {
  type: QuestionType;
  optionCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIndex = (value: unknown, length: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;

/** True when `value` is a permutation of 0 … length − 1. */
function isPermutation(value: unknown, length: number): value is number[] {
  if (!Array.isArray(value) || value.length !== length) return false;
  return value.every((v) => isIndex(v, length)) && new Set(value).size === length;
}

/**
 * Reads a stored test in progress, or returns null when it cannot be resumed: wrong version or
 * scope, a question that no longer exists (or whose options changed) after a site update, or
 * malformed data. Answers and flags are sanitized one by one; the structure must be intact.
 */
export function parseExam(
  data: unknown,
  scope: string,
  questions: ReadonlyMap<string, StoredQuestionInfo>,
): ExamState | null {
  if (!isRecord(data) || data.v !== EXAM_STATE_VERSION || data.scope !== scope) return null;
  const { startedAt, durationMs } = data;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt) || startedAt <= 0) return null;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  if (!Array.isArray(data.items) || data.items.length === 0) return null;
  const items: SessionItem[] = [];
  const seen = new Set<string>();
  for (const raw of data.items) {
    if (!isRecord(raw) || typeof raw.id !== "string" || seen.has(raw.id)) return null;
    const info = questions.get(raw.id);
    if (!info || !isPermutation(raw.optionOrder, info.optionCount)) return null;
    seen.add(raw.id);
    items.push({ id: raw.id, optionOrder: [...raw.optionOrder] });
  }

  const answers: Record<string, ExamAnswer> = {};
  const storedAnswers = isRecord(data.answers) ? data.answers : {};
  for (const { id } of items) {
    const answer = parseAnswer(storedAnswers[id], questions.get(id) as StoredQuestionInfo);
    if (answer) answers[id] = answer;
  }

  const storedFlags: unknown[] = Array.isArray(data.flagged) ? data.flagged : [];
  const flagged = [...new Set(storedFlags)].filter(
    (id): id is string => typeof id === "string" && seen.has(id),
  );

  return {
    scope,
    items,
    answers,
    flagged,
    position: isIndex(data.position, items.length) ? data.position : 0,
    startedAt,
    durationMs,
    reviewedOnly: data.reviewedOnly === true,
  };
}

function parseAnswer(raw: unknown, info: StoredQuestionInfo): ExamAnswer | null {
  if (!isRecord(raw)) return null;
  const selected = Array.isArray(raw.selected)
    ? [...new Set(raw.selected.filter((o): o is number => isIndex(o, info.optionCount)))].sort(
        (a, b) => a - b,
      )
    : [];
  // A radio group cannot show two choices: keep none rather than guess.
  const validSelection = info.type === "multiple" || selected.length <= 1 ? selected : [];
  const text =
    typeof raw.text === "string" && info.type === "short_answer"
      ? raw.text.slice(0, MAX_TEXT_LENGTH)
      : "";
  if (validSelection.length === 0 && text === "") return null;
  return { selected: validSelection, text };
}

// --------------------------------------------------------------------------- history

/** One finished test. */
export interface ExamAttempt {
  correct: number;
  total: number;
  /** When it was submitted (or ran out of time), in epoch milliseconds. */
  at: number;
  /** Time used, in milliseconds. */
  durationMs: number;
  reviewedOnly: boolean;
  /** Submitted automatically when the time ran out. */
  timedOut: boolean;
}

/** Past tests of one topic or tag. */
export interface ExamHistory {
  /** The most recent attempts, oldest first, at most `EXAM_HISTORY_LIMIT`. */
  attempts: ExamAttempt[];
  /** Best attempt ever (kept even when it drops out of `attempts`). */
  best?: ExamAttempt;
}

export const EMPTY_HISTORY: ExamHistory = { attempts: [] };

/** Higher percentage wins; on a tie the longer test wins; otherwise the earlier best stays. */
export function isBetterAttempt(candidate: ExamAttempt, best: ExamAttempt | undefined): boolean {
  if (!best) return true;
  const lhs = candidate.correct * best.total;
  const rhs = best.correct * candidate.total;
  return lhs > rhs || (lhs === rhs && candidate.total > best.total);
}

export function addAttempt(
  history: ExamHistory,
  attempt: ExamAttempt,
  limit: number = EXAM_HISTORY_LIMIT,
): ExamHistory {
  const attempts = [...history.attempts, attempt].slice(-limit);
  const best = isBetterAttempt(attempt, history.best) ? attempt : history.best;
  return best ? { attempts, best } : { attempts };
}

export function lastAttempt(history: ExamHistory): ExamAttempt | undefined {
  return history.attempts.at(-1);
}

function parseAttempt(raw: unknown): ExamAttempt | null {
  if (!isRecord(raw)) return null;
  const { correct, total, at, durationMs } = raw;
  const count = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
  if (!count(correct) || !count(total) || total === 0 || correct > total) return null;
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }
  return {
    correct,
    total,
    at,
    durationMs,
    reviewedOnly: raw.reviewedOnly === true,
    timedOut: raw.timedOut === true,
  };
}

/** Reads one stored history; malformed attempts are dropped. */
export function parseHistory(data: unknown): ExamHistory {
  if (!isRecord(data)) return { attempts: [] };
  const attempts = (Array.isArray(data.attempts) ? data.attempts : [])
    .map(parseAttempt)
    .filter((a): a is ExamAttempt => a !== null)
    .slice(-EXAM_HISTORY_LIMIT);
  let best = parseAttempt(data.best) ?? undefined;
  for (const a of attempts) if (isBetterAttempt(a, best)) best = a;
  return best ? { attempts, best } : { attempts };
}

/** "15 / 20 (75%)". */
export function describeAttempt(attempt: Pick<ExamAttempt, "correct" | "total">): string {
  return `${attempt.correct} / ${attempt.total} (${percentOf(attempt.correct, attempt.total)}%)`;
}

// The UI is in English: a fixed locale keeps dates readable next to it ("10 Oct 2026, 14:05").
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** When an attempt was made, in the browser's time zone. Call in the browser only. */
export function formatAttemptDate(at: number): string {
  return DATE_FORMAT.format(at);
}
