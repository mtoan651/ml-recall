import { describe, expect, it } from "vitest";
import type { ExamAttempt, ExamState, StoredQuestionInfo } from "./exam";
import {
  clearExam,
  DEFAULT_SETTINGS,
  EXAM_HISTORY_KEY,
  examKey,
  examTimeLeft,
  type KeyValueStore,
  loadExam,
  loadExamHistory,
  loadResults,
  loadSettings,
  RESULTS_KEY,
  SETTINGS_KEY,
  saveExam,
  saveExamAttempt,
  saveResult,
  saveResults,
  saveSettings,
  summarize,
} from "./storage";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("results", () => {
  it("saves the latest result per question id", () => {
    const store = memoryStore();
    saveResult("cnn-001", false, store, 1);
    saveResult("cnn-002", true, store, 2);
    saveResult("cnn-001", true, store, 3);
    expect(loadResults(store)).toEqual({
      "cnn-001": { correct: true, at: 3 },
      "cnn-002": { correct: true, at: 2 },
    });
  });

  it("survives missing, corrupt and blocked storage", () => {
    expect(loadResults(null)).toEqual({});
    expect(loadResults(memoryStore({ [RESULTS_KEY]: "{not json" }))).toEqual({});
    expect(loadResults(memoryStore({ [RESULTS_KEY]: "[1,2]" }))).toEqual({});
    expect(loadResults(brokenStore)).toEqual({});
    expect(() => saveResult("cnn-001", true, brokenStore)).not.toThrow();
  });

  it("saves several results in one write", () => {
    const store = memoryStore();
    saveResult("cnn-001", true, store, 1);
    saveResults(
      [
        ["cnn-001", false],
        ["cnn-002", true],
      ],
      store,
      5,
    );
    expect(loadResults(store)).toEqual({
      "cnn-001": { correct: false, at: 5 },
      "cnn-002": { correct: true, at: 5 },
    });
    expect(() => saveResults([["x", true]], brokenStore)).not.toThrow();
  });

  it("drops malformed entries", () => {
    const raw = JSON.stringify({ ok: { correct: true, at: 1 }, bad: { correct: "yes" } });
    expect(loadResults(memoryStore({ [RESULTS_KEY]: raw }))).toEqual({
      ok: { correct: true, at: 1 },
    });
  });

  it("summarizes answered and correct counts for a set of ids", () => {
    const results = {
      a: { correct: true, at: 1 },
      b: { correct: false, at: 1 },
      z: { correct: true, at: 1 },
    };
    expect(summarize(results, ["a", "b", "c"])).toEqual({ answered: 2, correct: 1 });
  });
});

describe("settings", () => {
  it("round-trips and falls back to defaults", () => {
    const store = memoryStore();
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    saveSettings({ shuffleQuestions: false, reviewedOnly: true }, store);
    expect(loadSettings(store)).toEqual({ shuffleQuestions: false, reviewedOnly: true });
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: '{"reviewedOnly":"x"}' }))).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(loadSettings(brokenStore)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("timed tests", () => {
  const scope = "topic:cnn";
  const info = new Map<string, StoredQuestionInfo>([
    ["cnn-001", { type: "single", optionCount: 3 }],
    ["cnn-002", { type: "short_answer", optionCount: 0 }],
  ]);
  const state: ExamState = {
    scope,
    items: [
      { id: "cnn-002", optionOrder: [] },
      { id: "cnn-001", optionOrder: [1, 2, 0] },
    ],
    answers: { "cnn-001": { selected: [2], text: "" } },
    flagged: ["cnn-002"],
    position: 1,
    startedAt: 1_000_000,
    durationMs: 120_000,
    reviewedOnly: false,
  };

  it("saves, resumes and clears the test in progress per scope", () => {
    const store = memoryStore();
    expect(loadExam(scope, info, store)).toBeNull();
    saveExam(state, store);
    expect(Object.keys(store.data)).toEqual([examKey(scope)]);
    expect(loadExam(scope, info, store)).toEqual(state);
    expect(loadExam("tag:cnn", info, store)).toBeNull();
    clearExam(scope, store);
    expect(loadExam(scope, info, store)).toBeNull();
  });

  it("reports the time left on a stored test", () => {
    const store = memoryStore();
    expect(examTimeLeft(scope, store, 1_000_000)).toBeNull();
    saveExam(state, store);
    expect(examTimeLeft(scope, store, 1_030_000)).toBe(90_000);
    expect(examTimeLeft(scope, store, 1_120_000)).toBeNull();
    store.data[examKey(scope)] = JSON.stringify({ v: 99, startedAt: 1, durationMs: 1e12 });
    expect(examTimeLeft(scope, store, 2)).toBeNull();
  });

  it("keeps history per scope", () => {
    const store = memoryStore();
    const attempt = (correct: number, at: number): ExamAttempt => ({
      correct,
      total: 20,
      at,
      durationMs: 600_000,
      reviewedOnly: false,
      timedOut: false,
    });
    expect(loadExamHistory(scope, store)).toEqual({ attempts: [] });
    saveExamAttempt(scope, attempt(18, 1), store);
    saveExamAttempt(scope, attempt(12, 2), store);
    saveExamAttempt("tag:cnn", attempt(5, 3), store);
    const history = loadExamHistory(scope, store);
    expect(history.attempts.map((a) => a.at)).toEqual([1, 2]);
    expect(history.best?.correct).toBe(18);
    expect(loadExamHistory("tag:cnn", store).attempts).toHaveLength(1);
  });

  it("survives missing, corrupt and blocked storage", () => {
    expect(loadExam(scope, info, null)).toBeNull();
    expect(loadExam(scope, info, brokenStore)).toBeNull();
    expect(loadExam(scope, info, memoryStore({ [examKey(scope)]: "{oops" }))).toBeNull();
    expect(() => saveExam(state, brokenStore)).not.toThrow();
    expect(() => clearExam(scope, brokenStore)).not.toThrow();
    expect(examTimeLeft(scope, brokenStore)).toBeNull();
    expect(loadExamHistory(scope, memoryStore({ [EXAM_HISTORY_KEY]: "[]" }))).toEqual({
      attempts: [],
    });
    expect(loadExamHistory(scope, brokenStore)).toEqual({ attempts: [] });
    expect(() =>
      saveExamAttempt(
        scope,
        { correct: 1, total: 1, at: 1, durationMs: 1, reviewedOnly: false, timedOut: false },
        brokenStore,
      ),
    ).not.toThrow();
  });
});
