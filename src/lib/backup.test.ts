import { describe, expect, it } from "vitest";
import {
  BackupError,
  backupFileName,
  createBackup,
  mergeBackup,
  mergeHistories,
  parseBackup,
} from "./backup";
import type { ExamAttempt } from "./exam";
import { SRS_KEY } from "./srs-due";
import {
  EXAM_HISTORY_KEY,
  examKey,
  type KeyValueStore,
  MIXED_KEY,
  RESULTS_KEY,
  SETTINGS_KEY,
} from "./storage";

function memoryStore(initial: Record<string, unknown> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(initial)) data[k] = JSON.stringify(v);
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

const json = (store: { data: Record<string, string> }, key: string) =>
  JSON.parse(store.data[key] ?? "null");
const attempt = (correct: number, total: number, at: number): ExamAttempt => ({
  correct,
  total,
  at,
  durationMs: 1000,
  reviewedOnly: false,
  timedOut: false,
});
const card = (lastReview: number) => [lastReview + 86_400_000, 3, 5, 1, 1, 0, 2, lastReview];

describe("export", () => {
  it("writes every progress key except tests in progress", () => {
    const store = memoryStore({
      [RESULTS_KEY]: { "a-001": { correct: true, at: 1 } },
      [SRS_KEY]: { "a-001": card(1) },
      [examKey("topic:cnn")]: { v: 1 },
      [SETTINGS_KEY]: { shuffleQuestions: false },
    });
    const backup = createBackup(store, Date.UTC(2026, 9, 12));
    expect(backup.app).toBe("ml-recall");
    expect(backup.exportedAt).toBe("2026-10-12T00:00:00.000Z");
    expect(Object.keys(backup.data)).toEqual([RESULTS_KEY, SRS_KEY, SETTINGS_KEY]);
    expect(createBackup(null).data).toEqual({});
    expect(backupFileName(new Date(2026, 0, 5).getTime())).toBe(
      "ml-recall-progress-2026-01-05.json",
    );
  });

  it("rejects files that are not backups", () => {
    expect(() => parseBackup("not json")).toThrow(BackupError);
    expect(() => parseBackup('{"app":"other","data":{}}')).toThrow(/not an ml-recall/);
    expect(() => parseBackup('{"app":"ml-recall","format":2,"data":{}}')).toThrow(/newer version/);
    const ok = parseBackup(JSON.stringify(createBackup(memoryStore())));
    expect(ok.format).toBe(1);
  });
});

describe("import merges", () => {
  it("keeps the newer result and card per question", () => {
    const store = memoryStore({
      [RESULTS_KEY]: { a: { correct: true, at: 10 }, b: { correct: false, at: 50 } },
      [SRS_KEY]: { a: card(10), b: card(50) },
    });
    const summary = mergeBackup(
      parseBackup(
        JSON.stringify({
          app: "ml-recall",
          format: 1,
          data: {
            [RESULTS_KEY]: {
              a: { correct: false, at: 20 },
              b: { correct: true, at: 40 },
              c: { correct: true, at: 5 },
              bad: { correct: "yes", at: 1 },
            },
            [SRS_KEY]: { a: card(20), b: card(40), c: card(5), bad: [1, 2] },
          },
        }),
      ),
      store,
    );
    expect(summary).toMatchObject({ results: 2, cards: 2 });
    expect(json(store, RESULTS_KEY)).toEqual({
      a: { correct: false, at: 20 },
      b: { correct: false, at: 50 },
      c: { correct: true, at: 5 },
    });
    expect(json(store, SRS_KEY).b).toEqual(card(50));
    expect(json(store, SRS_KEY).a).toEqual(card(20));
  });

  it("joins test histories and keeps the best", () => {
    const merged = mergeHistories(
      { attempts: [attempt(5, 10, 1), attempt(6, 10, 3)], best: attempt(6, 10, 3) },
      { attempts: [attempt(6, 10, 3), attempt(9, 10, 2)], best: attempt(9, 10, 2) },
    );
    expect(merged.attempts.map((a) => a.at)).toEqual([1, 2, 3]);
    expect(merged.best?.correct).toBe(9);
    const many = mergeHistories(
      { attempts: Array.from({ length: 8 }, (_, i) => attempt(1, 10, i)) },
      { attempts: Array.from({ length: 8 }, (_, i) => attempt(2, 10, 100 + i)) },
    );
    expect(many.attempts).toHaveLength(10);
    expect(many.attempts[0]?.at).toBe(6);

    const store = memoryStore({
      [EXAM_HISTORY_KEY]: { "topic:cnn": { attempts: [attempt(5, 10, 1)] } },
    });
    const summary = mergeBackup(
      {
        app: "ml-recall",
        format: 1,
        exportedAt: "",
        data: {
          [EXAM_HISTORY_KEY]: {
            "topic:cnn": { attempts: [attempt(5, 10, 1), attempt(8, 10, 2)] },
            "tag:softmax": { attempts: [attempt(3, 4, 9)] },
          },
        },
      },
      store,
    );
    expect(summary.tests).toBe(2);
    const all = json(store, EXAM_HISTORY_KEY);
    expect(all["topic:cnn"].attempts).toHaveLength(2);
    expect(all["topic:cnn"].best.correct).toBe(8);
    expect(all["tag:softmax"].attempts).toHaveLength(1);
  });

  it("takes settings only when this browser has none", () => {
    const store = memoryStore({ [SETTINGS_KEY]: { shuffleQuestions: true } });
    const summary = mergeBackup(
      {
        app: "ml-recall",
        format: 1,
        exportedAt: "",
        data: {
          [SETTINGS_KEY]: { shuffleQuestions: false },
          [MIXED_KEY]: { topics: ["cnn"], tags: [], difficulties: ["easy"], size: 10 },
        },
      },
      store,
    );
    expect(summary.preferences).toBe(1);
    expect(json(store, SETTINGS_KEY)).toEqual({ shuffleQuestions: true });
    expect(json(store, MIXED_KEY).size).toBe(10);
  });

  it("round-trips: importing an export into an empty browser restores it", () => {
    const source = memoryStore({
      [RESULTS_KEY]: { a: { correct: true, at: 10 } },
      [SRS_KEY]: { a: card(10) },
      [EXAM_HISTORY_KEY]: {
        "mixed:custom": { attempts: [attempt(7, 10, 4)], best: attempt(7, 10, 4) },
      },
    });
    const target = memoryStore();
    mergeBackup(parseBackup(JSON.stringify(createBackup(source))), target);
    for (const key of [RESULTS_KEY, SRS_KEY, EXAM_HISTORY_KEY]) {
      expect(json(target, key)).toEqual(json(source, key));
    }
    expect(() => mergeBackup(createBackup(source), null)).toThrow(BackupError);
  });
});
