/**
 * Grading rules (docs/web-app.md#grading):
 * - choice questions: the selected set must equal the set of correct options (all-or-nothing);
 * - short answers: auto-graded when the key has `numeric` (|x − value| ≤ tolerance), `accept`
 *   (text compared after normalization) or `pattern` (regex, full match); correct if any of
 *   them matches. Otherwise the learner self-grades.
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

const patternCache = new Map<string, RegExp | null>();

/**
 * The regex for a `pattern`: whole answer, case-insensitive. No `u` flag, so identity escapes
 * such as `\-` keep working as in Python's `re`. Null when the pattern does not compile.
 */
export function compilePattern(pattern: string): RegExp | null {
  let re = patternCache.get(pattern);
  if (re === undefined) {
    try {
      new RegExp(pattern); // alone first: "a)|(b" must not become valid once wrapped
      re = new RegExp(`^(?:${pattern})$`, "i");
    } catch {
      re = null;
    }
    patternCache.set(pattern, re);
  }
  return re;
}

/**
 * True when the trimmed, NFKC-normalized input fully matches `pattern`, ignoring case — the
 * rule of `ShortAnswer.matches_pattern` in schema.py. NFKC turns full-width "（32，3）" into
 * "(32,3)".
 */
export function matchesPattern(input: string, pattern: string): boolean {
  const re = compilePattern(pattern);
  return Boolean(re?.test(input.normalize("NFKC").trim()));
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
  pattern?: string | null | undefined;
}

/**
 * Auto-graded keys have `numeric`, `accept` or `pattern`; the others are self-graded against
 * the model answer.
 */
export function isAutoGraded(key: ShortAnswerKey): boolean {
  return key.accept.length > 0 || typeof key.numeric === "number" || Boolean(key.pattern);
}

/** Only a number can be right: `numeric` without `accept` or `pattern`. */
export function isNumericOnly(key: ShortAnswerKey): boolean {
  return typeof key.numeric === "number" && key.accept.length === 0 && !key.pattern;
}

export const NUMBER_HINT = "Enter a number, e.g. 42, -0.5, 1/3 or 2.5e-3.";
export const TEXT_HINT = "A word or short phrase";

/**
 * Format guidance under an auto-graded input: the key's `hint`, else a default for numbers or
 * for text. It says how to write an answer, never whether an answer is right.
 */
export function answerHint(key: ShortAnswerKey & { hint?: string | null | undefined }): string {
  if (key.hint) return key.hint;
  return typeof key.numeric === "number" ? NUMBER_HINT : TEXT_HINT;
}

export type ShortAnswerGrade =
  /** Graded: correct or not. */
  | { kind: "graded"; correct: boolean }
  /** Numeric-only key and the input is not a number: ask again, do not grade. */
  | { kind: "not-a-number" }
  /** Empty input: nothing to grade. */
  | { kind: "empty" }
  /** No `numeric`/`accept`/`pattern`: the learner compares with the model answer. */
  | { kind: "self-graded" };

/** Tries the keys in order numeric → accept → pattern; correct if any matches. */
export function gradeShortAnswer(input: string, key: ShortAnswerKey): ShortAnswerGrade {
  if (!isAutoGraded(key)) return { kind: "self-graded" };
  if (input.trim() === "") return { kind: "empty" };

  const numeric = typeof key.numeric === "number" ? key.numeric : null;
  const parsed = numeric === null ? null : parseNumber(input);
  if (numeric !== null && parsed !== null && withinTolerance(parsed, numeric, key.tolerance)) {
    return { kind: "graded", correct: true };
  }
  if (matchesText(input, key.accept)) return { kind: "graded", correct: true };
  if (key.pattern && matchesPattern(input, key.pattern)) return { kind: "graded", correct: true };
  if (parsed === null && isNumericOnly(key)) return { kind: "not-a-number" };
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
