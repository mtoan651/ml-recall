/**
 * Grading rules (docs/web-app.md#grading):
 * - choice questions: the selected set must equal the set of correct options (all-or-nothing);
 * - short answers: auto-graded when the key has `accept` (text compared after normalization)
 *   or `numeric` (|x − value| ≤ tolerance); otherwise the learner self-grades.
 */

/** Lowercase, Unicode-normalized, without whitespace and punctuation: "Batch-Norm." → "batchnorm". */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}]/gu, "");
}

/** True when `input` matches one of the accepted answers after normalization. */
export function matchesText(input: string, accept: readonly string[]): boolean {
  const got = normalizeAnswer(input);
  return got.length > 0 && accept.some((a) => normalizeAnswer(a) === got);
}

const DECIMAL = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const NUMBER_RE = new RegExp(`^[+-]?${DECIMAL}(?:e[+-]?\\d+)?$`, "i");
const FRACTION_RE = new RegExp(`^([+-]?${DECIMAL})/(${DECIMAL})$`);
const THOUSANDS_RE = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const DECIMAL_COMMA_RE = /^[+-]?\d*,\d+$/;

/**
 * Parses what a learner typed as a number. Accepts `760`, `-0.5`, `.5`, `7.6e2`, `1,000`
 * (thousands separators), `0,5` (decimal comma), `1/3`, a Unicode minus and inner spaces.
 * Returns `null` for anything else (the UI then asks for a number instead of grading).
 */
export function parseNumber(input: string): number | null {
  let s = input
    .normalize("NFKC")
    .replace(/[−‒–]/g, "-")
    .replace(/[\s_']/g, "");
  if (s === "") return null;
  if (THOUSANDS_RE.test(s)) s = s.replaceAll(",", "");
  else if (DECIMAL_COMMA_RE.test(s)) s = s.replace(",", ".");

  const fraction = FRACTION_RE.exec(s);
  const value = fraction
    ? Number(fraction[1]) / Number(fraction[2])
    : NUMBER_RE.test(s)
      ? Number(s)
      : Number.NaN;
  return Number.isFinite(value) ? value : null;
}

/** |x − value| ≤ tolerance, with a tiny relative slack for floating-point noise. */
export function withinTolerance(x: number, value: number, tolerance = 0): boolean {
  const slack = 1e-9 * Math.max(1, Math.abs(value));
  return Math.abs(x - value) <= tolerance + slack;
}

export interface ShortAnswerKey {
  accept: readonly string[];
  numeric?: number | null | undefined;
  tolerance?: number | undefined;
}

/** Auto-graded keys have `accept` or `numeric`; the others are self-graded against the model. */
export function isAutoGraded(key: ShortAnswerKey): boolean {
  return key.accept.length > 0 || typeof key.numeric === "number";
}

export type ShortAnswerGrade =
  /** Graded: correct or not. */
  | { kind: "graded"; correct: boolean }
  /** Numeric-only key and the input is not a number: ask again, do not grade. */
  | { kind: "not-a-number" }
  /** Empty input: nothing to grade. */
  | { kind: "empty" }
  /** No `accept`/`numeric`: the learner compares with the model answer. */
  | { kind: "self-graded" };

export function gradeShortAnswer(input: string, key: ShortAnswerKey): ShortAnswerGrade {
  if (!isAutoGraded(key)) return { kind: "self-graded" };
  if (input.trim() === "") return { kind: "empty" };

  const numeric = typeof key.numeric === "number" ? key.numeric : null;
  const parsed = numeric === null ? null : parseNumber(input);
  if (numeric !== null && parsed !== null && withinTolerance(parsed, numeric, key.tolerance)) {
    return { kind: "graded", correct: true };
  }
  if (matchesText(input, key.accept)) return { kind: "graded", correct: true };
  if (numeric !== null && parsed === null && key.accept.length === 0) {
    return { kind: "not-a-number" };
  }
  return { kind: "graded", correct: false };
}

export interface ChoiceGrade {
  correct: boolean;
  /** Correct options the learner did not select (original option indexes). */
  missed: number[];
  /** Selected options that are not correct (original option indexes). */
  wrong: number[];
}

/**
 * Grades a choice question. `correctFlags[i]` is option i's `correct`; `selected` holds the
 * chosen option indexes. All-or-nothing: correct only if exactly the correct options are chosen.
 */
export function gradeChoice(
  correctFlags: readonly boolean[],
  selected: Iterable<number>,
): ChoiceGrade {
  const chosen = new Set(selected);
  const missed: number[] = [];
  const wrong: number[] = [];
  correctFlags.forEach((isCorrect, i) => {
    if (isCorrect && !chosen.has(i)) missed.push(i);
    if (!isCorrect && chosen.has(i)) wrong.push(i);
  });
  for (const i of chosen) {
    if (i < 0 || i >= correctFlags.length) wrong.push(i);
  }
  return { correct: chosen.size > 0 && missed.length === 0 && wrong.length === 0, missed, wrong };
}
