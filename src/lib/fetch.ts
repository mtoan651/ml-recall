/**
 * Loads rendered questions from the static JSON files `data/q/<id>.json` (one per question,
 * built by src/pages/data/q/[id].json.ts). Cross-topic pages — mixed tests, My mistakes —
 * embed only the question index and fetch the few questions they show.
 */
import type { QuizQuestion } from "./types";
import { questionDataUrl } from "./url";

/** Some questions could not be loaded (offline, or removed from the site since). */
export class QuestionFetchError extends Error {
  readonly failed: string[];
  constructor(failed: string[]) {
    super(`Could not load ${failed.length === 1 ? "question" : "questions"} ${failed.join(", ")}`);
    this.name = "QuestionFetchError";
    this.failed = failed;
  }
}

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  urlOf?: (id: string) => string;
  /** Requests in flight at once. */
  concurrency?: number;
}

/** The questions `ids`, in the same order. Rejects with `QuestionFetchError` if any fails. */
export async function fetchQuestions(
  ids: readonly string[],
  { fetchImpl = fetch, urlOf = questionDataUrl, concurrency = 6 }: FetchOptions = {},
): Promise<QuizQuestion[]> {
  const out: Array<QuizQuestion | undefined> = new Array(ids.length);
  const failed: string[] = [];
  let next = 0;

  const worker = async () => {
    while (next < ids.length) {
      const i = next++;
      const id = ids[i] as string;
      try {
        const response = await fetchImpl(urlOf(id));
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as QuizQuestion;
        if (data?.id !== id) throw new Error("unexpected question");
        out[i] = data;
      } catch {
        failed.push(id);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  if (failed.length > 0) throw new QuestionFetchError(ids.filter((id) => failed.includes(id)));
  return out as QuizQuestion[];
}
