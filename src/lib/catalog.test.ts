import { describe, expect, it } from "vitest";
import {
  attemptPercents,
  catalogEntries,
  DIFFICULTIES,
  decodeTags,
  drawIds,
  encodeTags,
  mistakesByTopic,
  mistakesOf,
  progressOf,
  scopeTitle,
  selectionPool,
  tagCounts,
} from "./catalog";
import type { ExamAttempt } from "./exam";
import { mulberry32 } from "./shuffle";
import type { Catalog } from "./types";

const topic = (id: string, ids: string[], difficulty: string, status: string) => ({
  id,
  title: id.toUpperCase(),
  url: `/t/${id}/`,
  ids,
  difficulty,
  status,
});

const ids40 = Array.from({ length: 40 }, (_, i) => `t-${String(i).padStart(3, "0")}`);

const catalog: Catalog = {
  domains: [
    {
      id: "dl",
      title: "Deep Learning",
      topics: [
        topic("cnn", ["cnn-001", "cnn-002", "cnn-003"], "emh", "rrd"),
        topic("rnn", ["rnn-001", "rnn-002"], "-m", "rr"),
      ],
    },
    { id: "cv", title: "Computer Vision", topics: [topic("seg", ["seg-001"], "h", "r")] },
  ],
};

const attempt = (correct: number, total: number, at: number): ExamAttempt => ({
  correct,
  total,
  at,
  durationMs: 1000,
  reviewedOnly: false,
  timedOut: false,
});

describe("catalog entries", () => {
  it("decodes difficulty and status letters in catalog order", () => {
    const entries = catalogEntries(catalog);
    expect(entries.map((e) => e.id)).toEqual([
      "cnn-001",
      "cnn-002",
      "cnn-003",
      "rnn-001",
      "rnn-002",
      "seg-001",
    ]);
    expect(entries[0]).toMatchObject({ difficulty: "easy", reviewed: true, domainId: "dl" });
    expect(entries[2]).toMatchObject({ difficulty: "hard", reviewed: false });
    expect(entries[3]?.difficulty).toBeUndefined();
    expect(entries[5]).toMatchObject({ domainTitle: "Computer Vision", topic: { id: "seg" } });
  });
});

describe("mixed test pool", () => {
  const all = { topics: ["cnn", "rnn", "seg"], difficulties: DIFFICULTIES, reviewedOnly: false };

  it("filters by topic, difficulty and review status", () => {
    expect(selectionPool(catalog, all)).toHaveLength(6);
    expect(selectionPool(catalog, { ...all, topics: ["rnn"] })).toEqual(["rnn-001", "rnn-002"]);
    expect(selectionPool(catalog, { ...all, difficulties: ["hard"] })).toEqual([
      "cnn-003",
      "seg-001",
    ]);
    expect(selectionPool(catalog, { ...all, reviewedOnly: true })).not.toContain("cnn-003");
    expect(selectionPool(catalog, { ...all, topics: [] })).toEqual([]);
  });

  it("keeps questions without a difficulty only when no difficulty is filtered out", () => {
    expect(selectionPool(catalog, { ...all, topics: ["rnn"] })).toContain("rnn-001");
    expect(selectionPool(catalog, { ...all, topics: ["rnn"], difficulties: ["medium"] })).toEqual([
      "rnn-002",
    ]);
  });

  const encoded = encodeTags(catalog, [
    ["conv", ["seg-001", "cnn-002", "cnn-001", "gone-001"]],
    ["seq", ["rnn-002"]],
    ["empty", ["gone-002"]],
  ]);
  const tags = decodeTags(encoded);

  it("encodes each tag as sorted base-36 catalog positions, and decodes them", () => {
    expect(encoded).toBe("conv:0.1.5 seq:4");
    expect([...tags]).toEqual([
      ["conv", [0, 1, 5]],
      ["seq", [4]],
    ]);
    const many = encodeTags(
      { domains: [{ id: "d", title: "D", topics: [topic("t", ids40, "", "")] }] },
      [["late", ["t-039", "t-036"]]],
    );
    expect(many).toBe("late:10.13");
    expect(decodeTags(many).get("late")).toEqual([36, 39]);
    expect(decodeTags("").size).toBe(0);
  });

  it("counts questions per tag, the largest first", () => {
    expect(tagCounts(decodeTags(`${encoded} also:2.3.4`))).toEqual([
      { tag: "also", count: 3 },
      { tag: "conv", count: 3 },
      { tag: "seq", count: 1 },
    ]);
  });

  it("keeps questions with at least one chosen tag, within the other filters", () => {
    expect(selectionPool(catalog, { ...all, tags: ["conv"] }, tags)).toEqual([
      "cnn-001",
      "cnn-002",
      "seg-001",
    ]);
    expect(selectionPool(catalog, { ...all, tags: ["conv", "seq"] }, tags)).toHaveLength(4);
    expect(selectionPool(catalog, { ...all, topics: ["cnn"], tags: ["conv"] }, tags)).toEqual([
      "cnn-001",
      "cnn-002",
    ]);
    expect(
      selectionPool(catalog, { ...all, tags: ["conv"], difficulties: ["hard"] }, tags),
    ).toEqual(["seg-001"]);
    expect(selectionPool(catalog, { ...all, tags: [] }, tags)).toHaveLength(6);
    expect(selectionPool(catalog, { ...all, tags: ["unknown"] }, tags)).toEqual([]);
  });

  it("draws a uniformly random subset of the requested size", () => {
    const pool = selectionPool(catalog, all);
    const drawn = drawIds(pool, 4, mulberry32(7));
    expect(drawn).toHaveLength(4);
    expect(new Set(drawn).size).toBe(4);
    expect(drawn.every((id) => pool.includes(id))).toBe(true);
    expect(drawIds(pool, 50, mulberry32(7))).toHaveLength(6);
    expect(drawIds(pool, 0)).toEqual([]);
    expect(drawIds(pool, 4, mulberry32(7))).toEqual(drawn);
  });
});

describe("mistakes", () => {
  const results = {
    "cnn-001": { correct: false, at: 10 },
    "cnn-002": { correct: true, at: 30 },
    "rnn-002": { correct: false, at: 40 },
    "seg-001": { correct: false, at: 20 },
    "gone-001": { correct: false, at: 50 }, // retired: not in the catalog
  };

  it("lists questions whose latest answer was wrong, most recent first", () => {
    expect(mistakesOf(catalog, results).map((m) => [m.id, m.at])).toEqual([
      ["rnn-002", 40],
      ["seg-001", 20],
      ["cnn-001", 10],
    ]);
  });

  it("groups them by topic in catalog order", () => {
    const groups = mistakesByTopic(catalog, mistakesOf(catalog, results));
    expect(groups.map((g) => [g.topic.id, g.ids])).toEqual([
      ["cnn", ["cnn-001"]],
      ["rnn", ["rnn-002"]],
      ["seg", ["seg-001"]],
    ]);
    expect(groups[2]?.domainTitle).toBe("Computer Vision");
  });
});

describe("progress", () => {
  it("counts answered, correct and mistakes per topic and attaches topic tests", () => {
    const results = {
      "cnn-001": { correct: true, at: 1 },
      "cnn-002": { correct: false, at: 2 },
    };
    const history = { attempts: [attempt(3, 4, 5)], best: attempt(3, 4, 5) };
    const [dl] = progressOf(catalog, results, { "topic:cnn": history, "tag:cnn": history });
    expect(dl?.topics[0]).toMatchObject({ total: 3, answered: 2, correct: 1, mistakes: 1 });
    expect(dl?.topics[0]?.history).toBe(history);
    expect(dl?.topics[1]).toMatchObject({ answered: 0, history: { attempts: [] } });
  });

  it("names scopes and turns attempts into percentages", () => {
    expect(scopeTitle("topic:rnn", catalog)).toBe("RNN");
    expect(scopeTitle("tag:softmax", catalog)).toBe("#softmax");
    expect(scopeTitle("mixed:custom", catalog)).toBe("Mixed tests");
    expect(scopeTitle("topic:gone", catalog)).toBe("gone");
    expect(attemptPercents({ attempts: [attempt(1, 3, 1), attempt(20, 20, 2)] })).toEqual([
      { at: 1, percent: 33 },
      { at: 2, percent: 100 },
    ]);
  });
});
