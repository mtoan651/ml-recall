import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  type KeyValueStore,
  loadResults,
  loadSettings,
  RESULTS_KEY,
  SETTINGS_KEY,
  saveResult,
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
  };
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
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
