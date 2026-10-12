/**
 * Pure logic of the cross-topic pages, over the question index (`Catalog`, built in bank.ts):
 * the pool of a mixed test (topics × difficulties), the "My mistakes" deck and per-topic
 * progress. The pages fetch only the questions they show (src/lib/fetch.ts).
 */
import type { ExamHistory } from "./exam";
import { type Rng, shuffled } from "./shuffle";
import type { QuestionResult } from "./storage";
import type { Catalog, CatalogTopic, Difficulty } from "./types";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_CODE: Record<string, Difficulty> = { e: "easy", m: "medium", h: "hard" };

/** Test lengths offered for a mixed test (N questions in N minutes). */
export const MIXED_SIZES: readonly number[] = [10, 20, 30, 40, 50];
export const DEFAULT_MIXED_SIZE = 20;
/** "My mistakes" practices at most this many at once, the most recent first. */
export const MISTAKES_PER_ROUND = 50;

export interface CatalogEntry {
  id: string;
  topic: CatalogTopic;
  domainId: string;
  domainTitle: string;
  difficulty?: Difficulty;
  reviewed: boolean;
}

/** Every question of the catalog, in catalog order (domains, topics, file order). */
export function catalogEntries(catalog: Catalog): CatalogEntry[] {
  return catalog.domains.flatMap((domain) =>
    domain.topics.flatMap((topic) =>
      topic.ids.map((id, i) => {
        const difficulty = DIFFICULTY_CODE[topic.difficulty[i] ?? ""];
        return {
          id,
          topic,
          domainId: domain.id,
          domainTitle: domain.title,
          ...(difficulty ? { difficulty } : {}),
          reviewed: topic.status[i] === "r",
        };
      }),
    ),
  );
}

export interface MixedSelection {
  /** Topic ids to draw from. */
  topics: readonly string[];
  /** Difficulties to draw from. A question without a difficulty is drawn only when all three
   *  are selected (no difficulty filter). */
  difficulties: readonly Difficulty[];
  reviewedOnly: boolean;
}

/** Ids of the questions a mixed test with `selection` draws from, in catalog order. */
export function selectionPool(catalog: Catalog, selection: MixedSelection): string[] {
  const topics = new Set(selection.topics);
  const difficulties = new Set(selection.difficulties);
  const anyDifficulty = DIFFICULTIES.every((d) => difficulties.has(d));
  return catalogEntries(catalog)
    .filter(
      (e) =>
        topics.has(e.topic.id) &&
        (e.difficulty ? difficulties.has(e.difficulty) : anyDifficulty) &&
        (!selection.reviewedOnly || e.reviewed),
    )
    .map((e) => e.id);
}

/** `count` ids drawn uniformly at random from `pool`, in random order. */
export function drawIds(pool: readonly string[], count: number, rng: Rng = Math.random): string[] {
  return shuffled(pool, rng).slice(0, Math.max(0, count));
}

// --------------------------------------------------------------------------- mistakes

export interface Mistake extends CatalogEntry {
  /** When it was last answered (wrongly), in epoch milliseconds. */
  at: number;
}

/**
 * Questions whose latest result is wrong, most recent first. A question leaves the deck as soon
 * as it is answered correctly anywhere (practice or test). Ids no longer on the site (retired)
 * are ignored.
 */
export function mistakesOf(
  catalog: Catalog,
  results: Readonly<Record<string, QuestionResult>>,
): Mistake[] {
  return catalogEntries(catalog)
    .flatMap((e) => {
      const r = results[e.id];
      return r && !r.correct ? [{ ...e, at: r.at }] : [];
    })
    .sort((a, b) => b.at - a.at);
}

export interface MistakeGroup {
  topic: CatalogTopic;
  domainTitle: string;
  /** Most recent first. */
  ids: string[];
}

/** Mistakes per topic, topics in catalog order. */
export function mistakesByTopic(catalog: Catalog, mistakes: readonly Mistake[]): MistakeGroup[] {
  const byTopic = new Map<string, string[]>();
  for (const m of mistakes) {
    const ids = byTopic.get(m.topic.id) ?? [];
    ids.push(m.id);
    byTopic.set(m.topic.id, ids);
  }
  return catalog.domains.flatMap((domain) =>
    domain.topics.flatMap((topic) => {
      const ids = byTopic.get(topic.id);
      return ids ? [{ topic, domainTitle: domain.title, ids }] : [];
    }),
  );
}

// --------------------------------------------------------------------------- progress

export interface TopicProgress {
  topic: CatalogTopic;
  total: number;
  answered: number;
  correct: number;
  /** Latest result wrong. */
  mistakes: number;
  /** Timed tests of this topic. */
  history: ExamHistory;
}

export interface DomainProgress {
  id: string;
  title: string;
  topics: TopicProgress[];
}

const NO_HISTORY: ExamHistory = { attempts: [] };

/** Answered / correct / mistakes and test history per topic, in catalog order. */
export function progressOf(
  catalog: Catalog,
  results: Readonly<Record<string, QuestionResult>>,
  histories: Readonly<Record<string, ExamHistory>>,
): DomainProgress[] {
  return catalog.domains.map((domain) => ({
    id: domain.id,
    title: domain.title,
    topics: domain.topics.map((topic) => {
      let answered = 0;
      let correct = 0;
      for (const id of topic.ids) {
        const r = results[id];
        if (!r) continue;
        answered++;
        if (r.correct) correct++;
      }
      return {
        topic,
        total: topic.ids.length,
        answered,
        correct,
        mistakes: answered - correct,
        history: histories[`topic:${topic.id}`] ?? NO_HISTORY,
      };
    }),
  }));
}

/** Readable name of a test scope (`topic:cnn`, `tag:softmax`, `mixed:custom`). */
export function scopeTitle(scope: string, catalog: Catalog): string {
  const [kind, ...rest] = scope.split(":");
  const id = rest.join(":");
  if (kind === "tag") return `#${id}`;
  if (kind === "mixed") return "Mixed tests";
  for (const domain of catalog.domains) {
    const topic = domain.topics.find((t) => t.id === id);
    if (topic) return topic.title;
  }
  return id;
}

/** Percentage of each attempt with its time, oldest first (for a small trend chart). */
export function attemptPercents(history: ExamHistory): Array<{ at: number; percent: number }> {
  return history.attempts.map((a) => ({
    at: a.at,
    percent: a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
  }));
}
