import { describe, expect, it } from "vitest";
import { mulberry32, order, shuffled, shufflesOptions, weightedSample } from "./shuffle";

describe("shuffled", () => {
  it("returns a permutation and leaves the input untouched", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("is deterministic for a seeded RNG", () => {
    const a = shuffled([..."abcdefgh"], mulberry32(42));
    const b = shuffled([..."abcdefgh"], mulberry32(42));
    expect(a).toEqual(b);
    expect(a).not.toEqual([..."abcdefgh"]);
  });

  it("uses the injected RNG (always 0 → rotate left by one)", () => {
    expect(shuffled([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });

  it("puts every item in every position about equally often", () => {
    const rng = mulberry32(7);
    const n = 4;
    const runs = 20000;
    const counts = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let r = 0; r < runs; r++) {
      shuffled([0, 1, 2, 3], rng).forEach((item, pos) => {
        const row = counts[item];
        if (row) row[pos] = (row[pos] ?? 0) + 1;
      });
    }
    for (const row of counts) {
      for (const c of row) expect(Math.abs(c / runs - 1 / n)).toBeLessThan(0.02);
    }
  });

  it("handles empty and single-item lists", () => {
    expect(shuffled([], mulberry32(1))).toEqual([]);
    expect(shuffled(["x"], mulberry32(1))).toEqual(["x"]);
  });
});

describe("weightedSample", () => {
  const items = ["a", "b", "c", "d", "e", "f"];

  it("draws count distinct items, all of them when count is larger, none with weight 0", () => {
    const drawn = weightedSample(items, 4, () => 1, mulberry32(2));
    expect(drawn).toHaveLength(4);
    expect(new Set(drawn).size).toBe(4);
    expect([...weightedSample(items, 99, () => 1, mulberry32(2))].sort()).toEqual(items);
    expect(weightedSample(items, 99, (x) => (x === "c" ? 0 : 1), mulberry32(2))).not.toContain("c");
    expect(weightedSample(items, 0, () => 1)).toEqual([]);
    expect(weightedSample(items, 4, () => 1, mulberry32(2))).toEqual(drawn);
  });

  it("picks an item with probability proportional to its weight", () => {
    const rng = mulberry32(11);
    let heavy = 0;
    const runs = 10000;
    for (let r = 0; r < runs; r++) {
      if (weightedSample(["h", "l"], 1, (x) => (x === "h" ? 4 : 1), rng)[0] === "h") heavy++;
    }
    expect(Math.abs(heavy / runs - 0.8)).toBeLessThan(0.02);
  });

  it("returns the drawn items in random order, heavy ones not first", () => {
    const rng = mulberry32(5);
    let heavyFirst = 0;
    const runs = 4000;
    for (let r = 0; r < runs; r++) {
      if (weightedSample(["h", "l"], 2, (x) => (x === "h" ? 1000 : 1), rng)[0] === "h") {
        heavyFirst++;
      }
    }
    expect(Math.abs(heavyFirst / runs - 0.5)).toBeLessThan(0.04);
  });
});

describe("order", () => {
  it("keeps file order when shuffling is off", () => {
    expect(order(5, false, () => 0.5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("shuffles indexes when shuffling is on", () => {
    const out = order(6, true, mulberry32(3));
    expect([...out].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(out).not.toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("shufflesOptions", () => {
  it("respects shuffle: false", () => {
    expect(shufflesOptions({ type: "single", shuffle: false })).toBe(false);
    expect(shufflesOptions({ type: "multiple", shuffle: false })).toBe(false);
  });

  it("shuffles choice questions by default", () => {
    expect(shufflesOptions({ type: "single", shuffle: true })).toBe(true);
    expect(shufflesOptions({ type: "multiple", shuffle: true })).toBe(true);
  });

  it("keeps True/False in file order", () => {
    expect(shufflesOptions({ type: "true_false", shuffle: true })).toBe(false);
  });
});
