/**
 * Spaced repetition over question ids with FSRS (the `ts-fsrs` scheduler). Every graded answer
 * — practice, test, My mistakes, review — is a review of that question's card: a wrong answer
 * rates it Again, a right one Good; on the review page a right answer can be re-rated Hard or
 * Easy. Scheduling is in days (no same-day learning steps): a card is due on the local day of
 * its due date or later.
 *
 * Cards live in localStorage under `ml-recall:srs:v1` as compact tuples (`StoredCard`). Like
 * the rest of progress storage, every access tolerates a missing or broken store.
 */
import { type Card, createEmptyCard, type FSRS, fsrs, type Grade, Rating, State } from "ts-fsrs";
import { endOfDay, SRS_EVENT, SRS_KEY } from "./srs-due";
import type { KeyValueStore, Results } from "./storage";

export { endOfDay, SRS_KEY };

/** Days-based FSRS with the default weights and 90 % target retention; fuzz spreads due dates. */
export const scheduler: FSRS = fsrs({ enable_short_term: false, enable_fuzz: true });
/** The same without fuzz: stable interval labels on the rating buttons. */
export const previewScheduler: FSRS = fsrs({ enable_short_term: false, enable_fuzz: false });

export type Cards = Record<string, Card>;

/** `[due, stability, difficulty, scheduledDays, reps, lapses, state, lastReview]`, times in ms. */
export type StoredCard = [number, number, number, number, number, number, number, number];

export const GRADES: Record<"again" | "hard" | "good" | "easy", Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const DAY_MS = 86_400_000;

function toStored(card: Card): StoredCard {
  return [
    card.due.getTime(),
    card.stability,
    card.difficulty,
    card.scheduled_days,
    card.reps,
    card.lapses,
    card.state,
    card.last_review?.getTime() ?? 0,
  ];
}

function fromStored(value: unknown): Card | null {
  if (!Array.isArray(value) || value.length !== 8) return null;
  if (!value.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  const [due, stability, difficulty, scheduledDays, reps, lapses, state, lastReview] =
    value as StoredCard;
  if (!(state in State) || reps < 0 || lapses < 0) return null;
  return {
    due: new Date(due),
    stability,
    difficulty,
    elapsed_days: 0,
    scheduled_days: scheduledDays,
    learning_steps: 0,
    reps,
    lapses,
    state,
    ...(lastReview > 0 ? { last_review: new Date(lastReview) } : {}),
  };
}

/** Every stored card; malformed entries are skipped. */
export function loadCards(store: KeyValueStore | null): Cards {
  const cards: Cards = {};
  if (!store) return cards;
  try {
    const raw = store.getItem(SRS_KEY);
    const data: unknown = raw === null ? null : JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return cards;
    for (const [id, value] of Object.entries(data)) {
      const card = fromStored(value);
      if (card) cards[id] = card;
    }
  } catch {
    // unreadable: start empty
  }
  return cards;
}

export function saveCards(cards: Cards, store: KeyValueStore | null): void {
  if (!store) return;
  const data: Record<string, StoredCard> = {};
  for (const [id, card] of Object.entries(cards)) data[id] = toStored(card);
  try {
    store.setItem(SRS_KEY, JSON.stringify(data));
  } catch {
    // full or blocked: scheduling is a convenience, never an error
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SRS_EVENT));
}

/** The card after reviewing `card` (a new one when undefined) at `at` with `grade`. */
export function reviewCard(
  card: Card | undefined,
  at: number,
  grade: Grade,
  fsrsScheduler: FSRS = scheduler,
): Card {
  return fsrsScheduler.next(card ?? createEmptyCard(at), at, grade).card;
}

/** Records graded answers as reviews (wrong = Again, right = Good) and returns all cards. */
export function recordReviews(
  entries: Iterable<readonly [id: string, correct: boolean]>,
  at: number,
  store: KeyValueStore | null,
  fsrsScheduler: FSRS = scheduler,
): Cards {
  const cards = loadCards(store);
  for (const [id, correct] of entries) {
    cards[id] = reviewCard(cards[id], at, correct ? Rating.Good : Rating.Again, fsrsScheduler);
  }
  saveCards(cards, store);
  return cards;
}

/** Re-rates one answer: the card becomes `before` reviewed at `at` with `grade`. */
export function rateAnswer(
  id: string,
  before: Card | undefined,
  at: number,
  grade: Grade,
  store: KeyValueStore | null,
  fsrsScheduler: FSRS = scheduler,
): Card {
  const cards = loadCards(store);
  const card = reviewCard(before, at, grade, fsrsScheduler);
  cards[id] = card;
  saveCards(cards, store);
  return card;
}

/**
 * Cards for questions answered before scheduling existed (or on a device without cards): one
 * review at the time of the stored result. Existing cards are kept.
 */
export function withBackfill(
  cards: Cards,
  results: Readonly<Results>,
  fsrsScheduler: FSRS = scheduler,
): { cards: Cards; added: number } {
  const next: Cards = { ...cards };
  let added = 0;
  for (const [id, r] of Object.entries(results)) {
    if (next[id]) continue;
    next[id] = reviewCard(undefined, r.at, r.correct ? Rating.Good : Rating.Again, fsrsScheduler);
    added++;
  }
  return { cards: next, added };
}

/** Ids of the cards due today or earlier, among `known` ids, most overdue first. */
export function dueIds(cards: Readonly<Cards>, now: number, known?: ReadonlySet<string>): string[] {
  const limit = endOfDay(now);
  return Object.entries(cards)
    .filter(([id, card]) => card.due.getTime() < limit && (!known || known.has(id)))
    .sort(([a, x], [b, y]) => x.due.getTime() - y.due.getTime() || a.localeCompare(b))
    .map(([id]) => id);
}

/** Cards falling due on each of the next `days` local days (index 0 = tomorrow). */
export function forecast(
  cards: Readonly<Cards>,
  now: number,
  days = 7,
  known?: ReadonlySet<string>,
): number[] {
  const counts = new Array<number>(days).fill(0);
  let start = endOfDay(now);
  const bounds: number[] = [];
  for (let i = 0; i < days; i++) {
    const end = endOfDay(start);
    bounds.push(end);
    start = end;
  }
  const first = endOfDay(now);
  for (const [id, card] of Object.entries(cards)) {
    if (known && !known.has(id)) continue;
    const due = card.due.getTime();
    if (due < first) continue;
    const day = bounds.findIndex((end) => due < end);
    if (day >= 0) counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}

/** Interval in whole days that `grade` would give `card` reviewed at `at` (for button labels). */
export function previewDays(
  card: Card | undefined,
  at: number,
  grade: Grade,
  fsrsScheduler: FSRS = previewScheduler,
): number {
  const next = reviewCard(card, at, grade, fsrsScheduler);
  return Math.max(1, Math.round((next.due.getTime() - at) / DAY_MS));
}

/** "1 day", "12 days", "3 mo", "1.5 yr" — a compact interval label. */
export function formatInterval(days: number): string {
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${Math.round((days / 365) * 10) / 10} yr`;
}

/** Cards whose current interval is at least 21 days (Anki's "mature"). */
export const isMature = (card: Card): boolean => card.scheduled_days >= 21;
