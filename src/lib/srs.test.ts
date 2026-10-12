import { fsrs, Rating, State } from "ts-fsrs";
import { describe, expect, it, vi } from "vitest";
import {
  dueIds,
  endOfDay,
  forecast,
  formatInterval,
  loadCards,
  previewDays,
  rateAnswer,
  recordReviews,
  reviewCard,
  SRS_KEY,
  saveCards,
  withBackfill,
} from "./srs";
import { type KeyValueStore, saveResults } from "./storage";

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

/** Deterministic: no fuzz. */
const exact = fsrs({ enable_short_term: false, enable_fuzz: false });
const DAY = 86_400_000;
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime(); // 12 Oct 2026, 10:00 local

describe("reviews", () => {
  it("schedules a right answer later than a wrong one, and Easy later than Hard", () => {
    const again = reviewCard(undefined, T0, Rating.Again, exact);
    const hard = reviewCard(undefined, T0, Rating.Hard, exact);
    const good = reviewCard(undefined, T0, Rating.Good, exact);
    const easy = reviewCard(undefined, T0, Rating.Easy, exact);
    expect(again.due.getTime()).toBeGreaterThan(T0);
    expect(again.due.getTime()).toBeLessThanOrEqual(good.due.getTime());
    expect(hard.due.getTime()).toBeLessThanOrEqual(good.due.getTime());
    expect(good.due.getTime()).toBeLessThan(easy.due.getTime());
    expect(good.state).toBe(State.Review);
    expect(good.reps).toBe(1);
  });

  it("records answers as Again / Good and stores them compactly", () => {
    const store = memoryStore();
    const cards = recordReviews(
      [
        ["a-001", true],
        ["b-002", false],
      ],
      T0,
      store,
      exact,
    );
    expect(cards["b-002"]?.lapses).toBe(0);
    const stored = JSON.parse(store.data[SRS_KEY] ?? "{}");
    expect(stored["a-001"]).toHaveLength(8);
    const loaded = loadCards(store);
    expect(loaded["a-001"]?.due.getTime()).toBe(cards["a-001"]?.due.getTime());
    expect(loaded["a-001"]?.last_review?.getTime()).toBe(T0);
    // A second wrong answer after a right one is a lapse.
    const later = recordReviews([["a-001", false]], T0 + 5 * DAY, store, exact);
    expect(later["a-001"]?.lapses).toBe(1);
    expect(later["a-001"]?.reps).toBe(2);
  });

  it("skips malformed stored cards", () => {
    const store = memoryStore({
      [SRS_KEY]: JSON.stringify({ ok: [T0, 1, 5, 1, 1, 0, 2, T0], bad: [1, 2], worse: "x" }),
    });
    expect(Object.keys(loadCards(store))).toEqual(["ok"]);
    expect(loadCards(memoryStore({ [SRS_KEY]: "{not json" }))).toEqual({});
    expect(loadCards(null)).toEqual({});
  });

  it("re-rates an answer from the card as it was before", () => {
    const store = memoryStore();
    const before = recordReviews([["a-001", true]], T0, store, exact)["a-001"];
    const at = T0 + 3 * DAY;
    recordReviews([["a-001", true]], at, store, exact); // automatic Good
    const good = loadCards(store)["a-001"];
    const easy = rateAnswer("a-001", before, at, Rating.Easy, store, exact);
    expect(easy.due.getTime()).toBeGreaterThan(good?.due.getTime() ?? 0);
    expect(easy.reps).toBe(2);
    expect(previewDays(before, at, Rating.Easy, exact)).toBeGreaterThan(
      previewDays(before, at, Rating.Good, exact),
    );
  });

  it("answers recorded by saveResults also become reviews", async () => {
    const store = memoryStore();
    saveResults([["a-001", true]], store, T0);
    await vi.waitFor(() => expect(loadCards(store)["a-001"]).toBeDefined());
  });
});

describe("due cards", () => {
  const card = (dueAt: number) => ({
    ...reviewCard(undefined, T0, Rating.Good, exact),
    due: new Date(dueAt),
  });

  it("counts a card as due on its local day, most overdue first", () => {
    const cards = {
      later: card(endOfDay(T0) + 1000),
      tonight: card(endOfDay(T0) - 1000),
      old: card(T0 - 3 * DAY),
      gone: card(T0 - DAY),
    };
    expect(dueIds(cards, T0)).toEqual(["old", "gone", "tonight"]);
    expect(dueIds(cards, T0, new Set(["old", "tonight", "later"]))).toEqual(["old", "tonight"]);
  });

  it("forecasts the next days", () => {
    const cards = {
      a: card(endOfDay(T0) + 1000), // tomorrow
      b: card(endOfDay(T0) + DAY + 1000), // in 2 days
      c: card(endOfDay(T0) + 1000),
      d: card(T0 - DAY), // due now, not in the forecast
    };
    expect(forecast(cards, T0, 3)).toEqual([2, 1, 0]);
  });

  it("backfills cards from results stored before scheduling", () => {
    const existing = { a: card(T0 + DAY) };
    const { cards, added } = withBackfill(
      existing,
      { a: { correct: false, at: T0 }, b: { correct: true, at: T0 - 2 * DAY } },
      exact,
    );
    expect(added).toBe(1);
    expect(cards.a).toBe(existing.a);
    expect(cards.b?.last_review?.getTime()).toBe(T0 - 2 * DAY);
  });

  it("formats intervals", () => {
    expect(formatInterval(1)).toBe("1 day");
    expect(formatInterval(12)).toBe("12 days");
    expect(formatInterval(90)).toBe("3 mo");
    expect(formatInterval(548)).toBe("1.5 yr");
  });

  it("saves nothing without a store", () => {
    expect(() => saveCards({}, null)).not.toThrow();
  });
});
