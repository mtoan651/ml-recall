import { describe, expect, it } from "vitest";
import {
  addAttempt,
  answeredCount,
  createExam,
  describeAttempt,
  EXAM_HISTORY_LIMIT,
  EXAM_MAX_QUESTIONS,
  type ExamAction,
  type ExamAttempt,
  type ExamState,
  examPool,
  examReducer,
  examScope,
  formatClock,
  type GradingInput,
  gradeExamAnswer,
  isAnswered,
  isBetterAttempt,
  isExamEligible,
  isExpired,
  parseExam,
  parseHistory,
  planExam,
  remainingMs,
  type StoredQuestionInfo,
  scoreExam,
  selectExamItems,
  serializeExam,
  timerAnnouncement,
  timerLevel,
  timeUsedMs,
  unansweredCount,
} from "./exam";
import type { SessionInput } from "./session";
import { mulberry32 } from "./shuffle";
import type { QuestionType } from "./types";

const MIN = 60_000;

/** A pool of `n` single-choice questions with 4 options: q-001 … q-NNN. */
const pool = (n: number): SessionInput[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `q-${String(i + 1).padStart(3, "0")}`,
    shuffleOptions: true,
    optionCount: 4,
  }));

const run = (state: ExamState, ...actions: ExamAction[]) => actions.reduce(examReducer, state);

describe("eligibility", () => {
  it("takes every choice question and only auto-graded short answers", () => {
    expect(isExamEligible({ type: "single" })).toBe(true);
    expect(isExamEligible({ type: "multiple" })).toBe(true);
    expect(isExamEligible({ type: "true_false" })).toBe(true);
    expect(isExamEligible({ type: "short_answer", answer: { accept: ["relu"] } })).toBe(true);
    expect(isExamEligible({ type: "short_answer", answer: { accept: [], numeric: 0 } })).toBe(true);
    expect(isExamEligible({ type: "short_answer", answer: { accept: [], numeric: null } })).toBe(
      false,
    );
    expect(isExamEligible({ type: "short_answer", answer: { accept: [] } })).toBe(false);
    expect(isExamEligible({ type: "short_answer" })).toBe(false);
  });

  it("filters the pool, optionally to reviewed questions", () => {
    const questions: Array<{
      id: string;
      type: QuestionType;
      status: string;
      answer?: { accept: string[] };
    }> = [
      { id: "a", type: "single", status: "reviewed" },
      { id: "b", type: "single", status: "draft" },
      { id: "c", type: "short_answer", status: "reviewed", answer: { accept: [] } },
      { id: "d", type: "short_answer", status: "draft", answer: { accept: ["x"] } },
    ];
    expect(examPool(questions, false).map((q) => q.id)).toEqual(["a", "b", "d"]);
    expect(examPool(questions, true).map((q) => q.id)).toEqual(["a"]);
  });
});

describe("planExam", () => {
  it("caps a full test at 20 questions in 20 minutes", () => {
    expect(planExam(37)).toEqual({ available: 37, count: 20, durationMs: 20 * MIN, short: false });
    expect(planExam(20)).toEqual({ available: 20, count: 20, durationMs: 20 * MIN, short: false });
  });

  it("makes a shorter test when the pool is small (N < 20)", () => {
    expect(planExam(8)).toEqual({ available: 8, count: 8, durationMs: 8 * MIN, short: true });
    expect(planExam(1).durationMs).toBe(MIN);
    expect(planExam(0)).toMatchObject({ count: 0, durationMs: 0 });
  });
});

describe("selectExamItems", () => {
  it("draws min(20, pool) distinct questions from the pool", () => {
    const items = selectExamItems(pool(37), mulberry32(1));
    expect(items).toHaveLength(EXAM_MAX_QUESTIONS);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(EXAM_MAX_QUESTIONS);
    for (const id of ids) expect(pool(37).some((q) => q.id === id)).toBe(true);

    const small = selectExamItems(pool(8), mulberry32(1));
    expect(small.map((i) => i.id).sort()).toEqual(pool(8).map((q) => q.id));
  });

  it("is deterministic for a seeded RNG and random across seeds", () => {
    const a = selectExamItems(pool(37), mulberry32(42)).map((i) => i.id);
    const b = selectExamItems(pool(37), mulberry32(42)).map((i) => i.id);
    const c = selectExamItems(pool(37), mulberry32(43)).map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("gives every question about the same chance to be picked", () => {
    const rng = mulberry32(9);
    const counts = new Map<string, number>();
    const runs = 4000;
    for (let r = 0; r < runs; r++) {
      for (const { id } of selectExamItems(pool(40), rng)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const q of pool(40)) {
      expect(Math.abs((counts.get(q.id) ?? 0) / runs - 0.5)).toBeLessThan(0.04);
    }
  });

  it("shuffles options unless the question keeps file order", () => {
    const items = selectExamItems(
      [
        { id: "fixed", shuffleOptions: false, optionCount: 4 },
        { id: "tf", shuffleOptions: false, optionCount: 2 },
        { id: "open", shuffleOptions: true, optionCount: 0 },
        { id: "free", shuffleOptions: true, optionCount: 6 },
      ],
      mulberry32(3),
    );
    const byId = new Map(items.map((i) => [i.id, i.optionOrder]));
    expect(byId.get("fixed")).toEqual([0, 1, 2, 3]);
    expect(byId.get("tf")).toEqual([0, 1]);
    expect(byId.get("open")).toEqual([]);
    expect([...(byId.get("free") ?? [])].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(byId.get("free")).not.toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("respects a custom maximum", () => {
    expect(selectExamItems(pool(10), mulberry32(1), 3)).toHaveLength(3);
  });
});

describe("createExam and examReducer", () => {
  const fresh = () =>
    createExam(pool(5), {
      scope: examScope("topic", "cnn"),
      reviewedOnly: false,
      now: 1_000,
      rng: mulberry32(7),
    });

  it("starts with one minute per question and nothing answered", () => {
    const s = fresh();
    expect(s.scope).toBe("topic:cnn");
    expect(s.items).toHaveLength(5);
    expect(s.durationMs).toBe(5 * MIN);
    expect(s.startedAt).toBe(1_000);
    expect(s.position).toBe(0);
    expect(answeredCount(s)).toBe(0);
    expect(unansweredCount(s)).toBe(5);
  });

  it("records answers for the current question, toggling for multiple", () => {
    const s = fresh();
    const first = s.items[0]?.id as string;
    const second = s.items[1]?.id as string;
    let t = run(s, { type: "select", option: 2, multiple: false });
    t = run(t, { type: "select", option: 1, multiple: false });
    expect(t.answers[first]?.selected).toEqual([1]);

    t = run(
      t,
      { type: "next" },
      { type: "select", option: 3, multiple: true },
      { type: "select", option: 0, multiple: true },
      { type: "select", option: 3, multiple: true },
    );
    expect(t.answers[second]?.selected).toEqual([0]);
    expect(answeredCount(t)).toBe(2);

    t = run(t, { type: "select", option: 0, multiple: true });
    expect(isAnswered(t.answers[second])).toBe(false);
    expect(answeredCount(t)).toBe(1);
  });

  it("counts typed text as answered unless it is blank", () => {
    let t = run(fresh(), { type: "type", text: "   " });
    expect(answeredCount(t)).toBe(0);
    t = run(t, { type: "type", text: "760" });
    expect(answeredCount(t)).toBe(1);
  });

  it("navigates freely within bounds", () => {
    let t = run(fresh(), { type: "previous" });
    expect(t.position).toBe(0);
    t = run(t, { type: "goto", position: 4 }, { type: "next" });
    expect(t.position).toBe(4);
    t = run(t, { type: "previous" }, { type: "goto", position: 9 }, { type: "goto", position: -1 });
    expect(t.position).toBe(3);
    const same = run(t, { type: "goto", position: 3 });
    expect(same).toBe(t);
  });

  it("toggles the flag of the current question", () => {
    const s = fresh();
    const [a, b] = s.items.map((i) => i.id);
    let t = run(s, { type: "toggleFlag" }, { type: "next" }, { type: "toggleFlag" });
    expect(t.flagged).toEqual([a, b]);
    t = run(t, { type: "previous" }, { type: "toggleFlag" });
    expect(t.flagged).toEqual([b]);
  });
});

describe("timer", () => {
  const start = 1_700_000_000_000;

  it("derives the remaining time from the start timestamp", () => {
    expect(remainingMs(start, 20 * MIN, start)).toBe(20 * MIN);
    expect(remainingMs(start, 20 * MIN, start + 90_500)).toBe(20 * MIN - 90_500);
    // A tab that slept for an hour: no time left, never negative.
    expect(remainingMs(start, 20 * MIN, start + 60 * MIN)).toBe(0);
    // A clock set back before the start does not add time.
    expect(remainingMs(start, 20 * MIN, start - 5 * MIN)).toBe(20 * MIN);
  });

  it("knows when a test has expired", () => {
    const state = { startedAt: start, durationMs: 8 * MIN };
    expect(isExpired(state, start + 8 * MIN - 1)).toBe(false);
    expect(isExpired(state, start + 8 * MIN)).toBe(true);
  });

  it("reports the time used, capped at the limit", () => {
    expect(timeUsedMs(start, 20 * MIN, start + 754_000)).toBe(754_000);
    expect(timeUsedMs(start, 20 * MIN, start + 99 * MIN)).toBe(20 * MIN);
    expect(timeUsedMs(start, 20 * MIN, start - 1)).toBe(0);
  });

  it("formats mm:ss, rounding countdowns up and elapsed time down", () => {
    expect(formatClock(20 * MIN)).toBe("20:00");
    expect(formatClock(20 * MIN - 1)).toBe("20:00");
    expect(formatClock(59_001)).toBe("01:00");
    expect(formatClock(59_000)).toBe("00:59");
    expect(formatClock(1)).toBe("00:01");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(-5)).toBe("00:00");
    expect(formatClock(754_900, "floor")).toBe("12:34");
  });

  it("turns amber at 5:00 and red at 1:00, as displayed", () => {
    expect(timerLevel(20 * MIN)).toBe("normal");
    expect(timerLevel(5 * MIN + 1_000)).toBe("normal");
    expect(timerLevel(5 * MIN + 1)).toBe("normal"); // shows 05:01
    expect(timerLevel(5 * MIN)).toBe("warning"); // shows 05:00
    expect(timerLevel(MIN + 1)).toBe("warning"); // shows 01:01
    expect(timerLevel(MIN)).toBe("critical"); // shows 01:00
    expect(timerLevel(0)).toBe("critical");
  });

  it("announces only when the countdown turns amber or red", () => {
    expect(timerAnnouncement(20 * MIN, 20 * MIN - 1_000)).toBeNull();
    expect(timerAnnouncement(5 * MIN + 1_000, 5 * MIN)).toBe("5 minutes left.");
    expect(timerAnnouncement(5 * MIN, 5 * MIN - 1_000)).toBeNull(); // still amber
    expect(timerAnnouncement(MIN + 1_000, MIN)).toBe("1 minute left.");
    expect(timerAnnouncement(MIN, MIN - 1_000)).toBeNull(); // still red
    expect(timerAnnouncement(MIN, 0)).toBeNull(); // time up: the test submits itself
    // The tab slept from 10:00 to 0:30: say what is actually left.
    expect(timerAnnouncement(10 * MIN, 30_000)).toBe("30 seconds left.");
    expect(timerAnnouncement(10 * MIN, 4 * MIN + 59_000)).toBe("4 minutes left.");
  });
});

describe("scoring", () => {
  const single: GradingInput = {
    type: "single",
    options: [{ correct: false }, { correct: true }, { correct: false }],
  };
  const multiple: GradingInput = {
    type: "multiple",
    options: [{ correct: true }, { correct: false }, { correct: true }],
  };
  const text: GradingInput = {
    type: "short_answer",
    answer: { accept: ["batch normalization", "BN"] },
  };
  const numeric: GradingInput = {
    type: "short_answer",
    answer: { accept: [], numeric: 760, tolerance: 0 },
  };

  it("grades choice questions, multiple all-or-nothing", () => {
    expect(gradeExamAnswer(single, { selected: [1], text: "" })).toBe("correct");
    expect(gradeExamAnswer(single, { selected: [0], text: "" })).toBe("incorrect");
    expect(gradeExamAnswer(multiple, { selected: [0, 2], text: "" })).toBe("correct");
    expect(gradeExamAnswer(multiple, { selected: [0], text: "" })).toBe("incorrect");
    expect(gradeExamAnswer(multiple, { selected: [0, 1, 2], text: "" })).toBe("incorrect");
  });

  it("grades short answers with the practice rules", () => {
    expect(gradeExamAnswer(text, { selected: [], text: "Batch-Normalization" })).toBe("correct");
    expect(gradeExamAnswer(text, { selected: [], text: "layer norm" })).toBe("incorrect");
    expect(gradeExamAnswer(numeric, { selected: [], text: "7.6e2" })).toBe("correct");
    expect(gradeExamAnswer(numeric, { selected: [], text: "761" })).toBe("incorrect");
    // Not a number for a numeric-only key: wrong, since a test cannot ask again.
    expect(gradeExamAnswer(numeric, { selected: [], text: "seven hundred" })).toBe("incorrect");
  });

  it("treats empty answers as unanswered", () => {
    expect(gradeExamAnswer(single, undefined)).toBe("unanswered");
    expect(gradeExamAnswer(single, { selected: [], text: "" })).toBe("unanswered");
    expect(gradeExamAnswer(text, { selected: [], text: "  " })).toBe("unanswered");
  });

  it("scores a whole test", () => {
    const questions = new Map<string, GradingInput>([
      ["a", single],
      ["b", multiple],
      ["c", text],
      ["d", numeric],
    ]);
    const items = ["a", "b", "c", "d", "gone"].map((id) => ({ id, optionOrder: [] }));
    const result = scoreExam(
      {
        items,
        answers: {
          a: { selected: [1], text: "" },
          b: { selected: [0], text: "" },
          c: { selected: [], text: "BN" },
        },
      },
      questions,
    );
    expect(result).toEqual({
      total: 5,
      correct: 2,
      incorrect: 1,
      unanswered: 2,
      percent: 40,
      outcomes: { a: "correct", b: "incorrect", c: "correct", d: "unanswered", gone: "unanswered" },
    });
  });
});

describe("persistence", () => {
  const scope = examScope("topic", "cnn");
  const info = new Map<string, StoredQuestionInfo>([
    ["q-001", { type: "single", optionCount: 4 }],
    ["q-002", { type: "multiple", optionCount: 3 }],
    ["q-003", { type: "short_answer", optionCount: 0 }],
    ["q-004", { type: "true_false", optionCount: 2 }],
  ]);
  const state: ExamState = {
    scope,
    items: [
      { id: "q-002", optionOrder: [2, 0, 1] },
      { id: "q-001", optionOrder: [3, 1, 0, 2] },
      { id: "q-003", optionOrder: [] },
    ],
    answers: {
      "q-002": { selected: [0, 2], text: "" },
      "q-003": { selected: [], text: "760" },
    },
    flagged: ["q-001"],
    position: 2,
    startedAt: 1_700_000_000_000,
    durationMs: 3 * MIN,
    reviewedOnly: true,
  };
  const roundTrip = (s: unknown) => parseExam(JSON.parse(JSON.stringify(s)), scope, info);
  const stored = () => JSON.parse(serializeExam(state)) as Record<string, unknown>;

  it("round-trips a test in progress", () => {
    expect(parseExam(JSON.parse(serializeExam(state)), scope, info)).toEqual(state);
  });

  it("rejects other versions, scopes and malformed data", () => {
    expect(parseExam(undefined, scope, info)).toBeNull();
    expect(parseExam("x", scope, info)).toBeNull();
    expect(parseExam([], scope, info)).toBeNull();
    expect(roundTrip({ ...stored(), v: 2 })).toBeNull();
    expect(parseExam(JSON.parse(serializeExam(state)), "tag:cnn", info)).toBeNull();
    expect(roundTrip({ ...stored(), startedAt: "yesterday" })).toBeNull();
    expect(roundTrip({ ...stored(), durationMs: 0 })).toBeNull();
    expect(roundTrip({ ...stored(), items: [] })).toBeNull();
  });

  it("rejects a test whose questions changed after a site update", () => {
    const unknownId = { ...stored(), items: [{ id: "q-999", optionOrder: [] }] };
    expect(roundTrip(unknownId)).toBeNull();
    const fewerOptions = { ...stored(), items: [{ id: "q-001", optionOrder: [0, 1, 2] }] };
    expect(roundTrip(fewerOptions)).toBeNull();
    const notPermutation = { ...stored(), items: [{ id: "q-001", optionOrder: [0, 0, 1, 2] }] };
    expect(roundTrip(notPermutation)).toBeNull();
    const duplicate = {
      ...stored(),
      items: [
        { id: "q-004", optionOrder: [0, 1] },
        { id: "q-004", optionOrder: [0, 1] },
      ],
    };
    expect(roundTrip(duplicate)).toBeNull();
  });

  it("sanitizes answers, flags and position", () => {
    const parsed = roundTrip({
      ...stored(),
      answers: {
        "q-002": { selected: [2, 9, 0, 0, "1"], text: "ignored for choice" },
        "q-001": { selected: [0, 1] }, // two choices for single choice: dropped
        "q-003": { text: 42 },
        "q-999": { selected: [0] },
      },
      flagged: ["q-001", "q-001", "q-999", 7],
      position: 3,
      reviewedOnly: "yes",
    });
    expect(parsed?.answers).toEqual({ "q-002": { selected: [0, 2], text: "" } });
    expect(parsed?.flagged).toEqual(["q-001"]);
    expect(parsed?.position).toBe(0);
    expect(parsed?.reviewedOnly).toBe(false);
  });

  it("resumes an expired test so it can be submitted on load", () => {
    const expired = roundTrip({ ...stored(), startedAt: 1_000 });
    expect(expired).not.toBeNull();
    expect(isExpired(expired as ExamState, Date.now())).toBe(true);
    const result = scoreExam(expired as ExamState, new Map());
    expect(result.total).toBe(3);
  });
});

describe("history", () => {
  const attempt = (correct: number, total: number, at: number): ExamAttempt => ({
    correct,
    total,
    at,
    durationMs: 60_000,
    reviewedOnly: false,
    timedOut: false,
  });

  it("ranks by percentage, then by test length, and keeps the earlier best on a tie", () => {
    expect(isBetterAttempt(attempt(1, 1, 1), undefined)).toBe(true);
    expect(isBetterAttempt(attempt(16, 20, 2), attempt(7, 10, 1))).toBe(true);
    expect(isBetterAttempt(attempt(7, 10, 2), attempt(16, 20, 1))).toBe(false);
    expect(isBetterAttempt(attempt(18, 20, 2), attempt(9, 10, 1))).toBe(true);
    expect(isBetterAttempt(attempt(9, 10, 2), attempt(18, 20, 1))).toBe(false);
    expect(isBetterAttempt(attempt(9, 10, 2), attempt(9, 10, 1))).toBe(false);
  });

  it("keeps the last 10 attempts and the best one ever", () => {
    let h = addAttempt({ attempts: [] }, attempt(20, 20, 0));
    for (let i = 1; i <= 12; i++) h = addAttempt(h, attempt(i % 15, 20, i));
    expect(h.attempts).toHaveLength(EXAM_HISTORY_LIMIT);
    expect(h.attempts[0]?.at).toBe(3);
    expect(h.attempts.at(-1)?.at).toBe(12);
    expect(h.best?.at).toBe(0);
  });

  it("parses stored history leniently", () => {
    expect(parseHistory(undefined)).toEqual({ attempts: [] });
    expect(parseHistory({ attempts: "x" })).toEqual({ attempts: [] });
    const parsed = parseHistory({
      attempts: [
        attempt(5, 10, 1),
        { correct: 11, total: 10, at: 2, durationMs: 1 },
        { correct: 1, total: 0, at: 3, durationMs: 1 },
        { ...attempt(8, 10, 4), timedOut: true },
      ],
      best: { correct: "all" },
    });
    expect(parsed.attempts.map((a) => a.at)).toEqual([1, 4]);
    expect(parsed.attempts[1]?.timedOut).toBe(true);
    expect(parsed.best?.at).toBe(4); // recomputed from the valid attempts
  });

  it("describes an attempt", () => {
    expect(describeAttempt(attempt(15, 20, 0))).toBe("15 / 20 (75%)");
    expect(describeAttempt(attempt(1, 3, 0))).toBe("1 / 3 (33%)");
  });
});
