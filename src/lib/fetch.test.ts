import { describe, expect, it } from "vitest";
import { fetchQuestions, QuestionFetchError } from "./fetch";

/** A fake `fetch` serving `{ id }` for known ids and 404 otherwise; records concurrency. */
function fakeFetch(known: string[], log: { inFlight: number; max: number; urls: string[] }) {
  return (async (input: string | URL | Request) => {
    const u = String(input);
    log.urls.push(u);
    log.inFlight++;
    log.max = Math.max(log.max, log.inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    log.inFlight--;
    const id = u.replace(/^q\//, "").replace(/\.json$/, "");
    if (!known.includes(id)) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify({ id: id === "evil-001" ? "other-001" : id }));
  }) as typeof fetch;
}

const urlOf = (id: string) => `q/${id}.json`;

describe("fetchQuestions", () => {
  it("returns the questions in the order asked, with bounded concurrency", async () => {
    const log = { inFlight: 0, max: 0, urls: [] as string[] };
    const ids = ["a-003", "a-001", "a-002", "a-004", "a-005"];
    const out = await fetchQuestions(ids, {
      fetchImpl: fakeFetch(ids, log),
      urlOf,
      concurrency: 2,
    });
    expect(out.map((q) => q.id)).toEqual(ids);
    expect(log.max).toBe(2);
    expect(log.urls).toHaveLength(5);
  });

  it("rejects with the ids that failed (missing or not the question asked for)", async () => {
    const log = { inFlight: 0, max: 0, urls: [] as string[] };
    const promise = fetchQuestions(["a-001", "gone-001", "evil-001"], {
      fetchImpl: fakeFetch(["a-001", "evil-001"], log),
      urlOf,
    });
    await expect(promise).rejects.toBeInstanceOf(QuestionFetchError);
    await expect(promise).rejects.toMatchObject({ failed: ["gone-001", "evil-001"] });
  });

  it("does nothing for an empty list", async () => {
    const log = { inFlight: 0, max: 0, urls: [] as string[] };
    expect(await fetchQuestions([], { fetchImpl: fakeFetch([], log), urlOf })).toEqual([]);
    expect(log.urls).toEqual([]);
  });
});
