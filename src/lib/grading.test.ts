import { describe, expect, it } from "vitest";
import {
  answerHint,
  compilePattern,
  gradeChoice,
  gradeShortAnswer,
  isAutoGraded,
  isNumericOnly,
  matchesPattern,
  matchesText,
  NUMBER_HINT,
  normalizeAnswer,
  parseNumber,
  TEXT_HINT,
  withinTolerance,
} from "./grading";

describe("normalizeAnswer", () => {
  it("lowercases and strips whitespace and punctuation", () => {
    expect(normalizeAnswer("  Batch-Norm. ")).toBe("batchnorm");
    expect(normalizeAnswer("Batch\tNormalization!")).toBe("batchnormalization");
    expect(normalizeAnswer("“ReLU”, (rectifier)")).toBe("relurectifier");
  });

  it("keeps math symbols, which carry meaning", () => {
    expect(normalizeAnswer("x^2 + 1")).toBe("x^2+1");
    expect(normalizeAnswer("C++")).not.toBe(normalizeAnswer("C"));
  });

  it("normalizes Unicode compatibility forms", () => {
    expect(normalizeAnswer("ＢＮ")).toBe("bn"); // full-width letters
  });
});

describe("matchesText", () => {
  const accept = ["batch normalization", "batchnorm", "BN"];

  it("matches any accepted answer ignoring case, spaces and punctuation", () => {
    expect(matchesText("Batch Normalization", accept)).toBe(true);
    expect(matchesText("batch-norm", accept)).toBe(true);
    expect(matchesText("b.n.", accept)).toBe(true);
  });

  it("rejects other answers and empty input", () => {
    expect(matchesText("layer normalization", accept)).toBe(false);
    expect(matchesText("   ", accept)).toBe(false);
    expect(matchesText("...", accept)).toBe(false);
  });
});

describe("parseNumber", () => {
  it.each([
    ["760", 760],
    [" -0.5 ", -0.5],
    ["+3", 3],
    [".25", 0.25],
    ["7.6e2", 760],
    ["2.5E-3", 0.0025],
    ["1,000", 1000],
    ["1,234,567.5", 1234567.5],
    ["0,5", 0.5],
    ["1 000", 1000],
    ["1/4", 0.25],
    ["−2", -2], // Unicode minus
  ])("parses %j as %d", (input, expected) => {
    expect(parseNumber(input)).toBeCloseTo(expected, 12);
  });

  it.each(["", "abc", "12abc", "1/0", "1..2", "e5", "--1", "50%"])("rejects %j", (input) => {
    expect(parseNumber(input)).toBeNull();
  });
});

describe("withinTolerance", () => {
  it("is exact by default but forgives floating-point noise", () => {
    expect(withinTolerance(28, 28)).toBe(true);
    expect(withinTolerance(28.0001, 28)).toBe(false);
    expect(withinTolerance(0.1 + 0.2, 0.3)).toBe(true);
  });

  it("uses an absolute tolerance, inclusive", () => {
    expect(withinTolerance(3.14, Math.PI, 0.01)).toBe(true);
    expect(withinTolerance(3.2, 3, 0.2)).toBe(true);
    expect(withinTolerance(3.21, 3, 0.2)).toBe(false);
    expect(withinTolerance(2.79, 3, 0.2)).toBe(false);
  });
});

describe("gradeShortAnswer", () => {
  it("grades numeric answers with tolerance", () => {
    const key = { accept: [], numeric: 760, tolerance: 0 };
    expect(gradeShortAnswer("760", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("7.6e2", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("750", key)).toEqual({ kind: "graded", correct: false });
    expect(gradeShortAnswer("0.31", { accept: [], numeric: 0.3, tolerance: 0.01 })).toEqual({
      kind: "graded",
      correct: true,
    });
  });

  it("asks for a number instead of grading text against a numeric key", () => {
    const key = { accept: [], numeric: 28 };
    expect(gradeShortAnswer("twenty-eight", key)).toEqual({ kind: "not-a-number" });
    expect(gradeShortAnswer("  ", key)).toEqual({ kind: "empty" });
  });

  it("grades text answers", () => {
    const key = { accept: ["batchnorm"] };
    expect(gradeShortAnswer("Batch-Norm", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("dropout", key)).toEqual({ kind: "graded", correct: false });
  });

  it("accepts either form when both accept and numeric are set", () => {
    const key = { accept: ["twenty-eight"], numeric: 28 };
    expect(gradeShortAnswer("28", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("Twenty eight", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("thirty", key)).toEqual({ kind: "graded", correct: false });
  });

  it("leaves open questions to self-grading", () => {
    const key = { accept: [], numeric: null };
    expect(isAutoGraded(key)).toBe(false);
    expect(gradeShortAnswer("anything", key)).toEqual({ kind: "self-graded" });
  });

  it("grades pattern-only keys (and they count as auto-graded)", () => {
    const key = { accept: [], pattern: SHAPE };
    expect(isAutoGraded(key)).toBe(true);
    expect(isNumericOnly(key)).toBe(false);
    expect(gradeShortAnswer("32x3x64x64", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("(3, 32, 64, 64)", key)).toEqual({ kind: "graded", correct: false });
    expect(gradeShortAnswer(" ", key)).toEqual({ kind: "empty" });
  });

  it("is correct when any of numeric, accept or pattern matches", () => {
    const key = {
      accept: ["seven hundred sixty"],
      numeric: 760,
      pattern: "7\\s*6\\s*0\\s*params?",
    };
    expect(gradeShortAnswer("760", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("Seven hundred sixty", key)).toEqual({ kind: "graded", correct: true });
    expect(gradeShortAnswer("760 params", key)).toEqual({ kind: "graded", correct: true });
    // With a pattern a non-number is graded, not refused.
    expect(gradeShortAnswer("many", key)).toEqual({ kind: "graded", correct: false });
  });
});

/** The shape question pytorch-005: (batch, channels, height, width) in several spellings. */
const SHAPE = String.raw`\(?\s*32\s*[,x×]\s*3\s*[,x×]\s*64\s*[,x×]\s*64\s*\)?`;

describe("matchesPattern", () => {
  it.each([
    "(32, 3, 64, 64)",
    "32x3x64x64",
    "32 × 3 × 64 × 64",
    "（32，3，64，64）",
    " 32X3X64X64 ",
  ])("accepts %j", (input) => {
    expect(matchesPattern(input, SHAPE)).toBe(true);
  });

  it.each(["(3, 32, 64, 64)", "(32, 3, 64)", "32x3x64x64x1", "shape (32, 3, 64, 64)", ""])(
    "rejects %j",
    (input) => {
      expect(matchesPattern(input, SHAPE)).toBe(false);
    },
  );

  it("matches the whole answer, even across alternatives", () => {
    expect(matchesPattern("relu", "relu|gelu")).toBe(true);
    expect(matchesPattern("relu6", "relu|gelu")).toBe(false);
    expect(matchesPattern("leaky relu", "relu|gelu")).toBe(false);
  });

  it("keeps identity escapes working (no `u` flag)", () => {
    expect(matchesPattern("t-sne", String.raw`t\-sne`)).toBe(true);
  });

  it("never matches with an invalid pattern", () => {
    expect(compilePattern("(32, 3")).toBeNull();
    expect(compilePattern("a)|(b")).toBeNull();
    expect(matchesPattern("a", "a)|(b")).toBe(false);
  });
});

describe("answerHint", () => {
  it("uses the key's hint, else a default for numbers or text", () => {
    expect(answerHint({ accept: [], pattern: SHAPE, hint: "e.g. 8×1×28×28" })).toBe(
      "e.g. 8×1×28×28",
    );
    expect(answerHint({ accept: [], numeric: 760 })).toBe(NUMBER_HINT);
    expect(answerHint({ accept: ["relu"], numeric: 1 })).toBe(NUMBER_HINT);
    expect(answerHint({ accept: ["batchnorm"] })).toBe(TEXT_HINT);
  });
});

describe("gradeChoice", () => {
  it("grades single choice", () => {
    const flags = [false, true, false];
    expect(gradeChoice(flags, [1])).toEqual({ correct: true, missed: [], wrong: [] });
    expect(gradeChoice(flags, [2])).toEqual({ correct: false, missed: [1], wrong: [2] });
  });

  it("grades multiple choice all-or-nothing", () => {
    const flags = [true, true, false, false];
    expect(gradeChoice(flags, [0, 1]).correct).toBe(true);
    expect(gradeChoice(flags, [1, 0]).correct).toBe(true);
    expect(gradeChoice(flags, [0])).toEqual({ correct: false, missed: [1], wrong: [] });
    expect(gradeChoice(flags, [0, 1, 2])).toEqual({ correct: false, missed: [], wrong: [2] });
  });

  it("never counts an empty or out-of-range selection as correct", () => {
    expect(gradeChoice([true], []).correct).toBe(false);
    expect(gradeChoice([true, false], [0, 7]).correct).toBe(false);
  });
});
