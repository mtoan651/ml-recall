import { useCallback, useEffect, useRef, useState } from "react";
import { MISTAKES_PER_ROUND, type MistakeGroup, mistakesByTopic, mistakesOf } from "../lib/catalog";
import { fetchQuestions } from "../lib/fetch";
import { loadResults } from "../lib/storage";
import type { Catalog, QuizQuestion } from "../lib/types";
import { mixedExamUrl, url } from "../lib/url";
import Quiz from "./Quiz";

type View =
  | { name: "loading" }
  | { name: "list" }
  | { name: "fetching"; count: number }
  | { name: "practice"; questions: QuizQuestion[]; label: string };

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

/**
 * "My mistakes": every question whose latest answer (practice or test) was wrong, grouped by
 * topic. Practicing one fetches those questions and runs the usual quiz; a question leaves the
 * deck once it is answered correctly.
 */
export default function Mistakes({ catalog }: { catalog: Catalog }) {
  const [view, setView] = useState<View>({ name: "loading" });
  const [groups, setGroups] = useState<MistakeGroup[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const back = useRef(false);

  const refresh = useCallback(() => {
    const mistakes = mistakesOf(catalog, loadResults());
    setRecent(mistakes.map((m) => m.id));
    setGroups(mistakesByTopic(catalog, mistakes));
    setView({ name: "list" });
  }, [catalog]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (view.name === "list" && back.current) {
      back.current = false;
      headingRef.current?.focus();
    }
  }, [view.name]);

  const practice = async (ids: string[], label: string) => {
    const round = ids.slice(0, MISTAKES_PER_ROUND);
    setError("");
    setView({ name: "fetching", count: round.length });
    try {
      const questions = await fetchQuestions(round);
      setView({ name: "practice", questions, label });
      window.scrollTo({ top: 0 });
    } catch {
      setError("Could not load the questions. Check your connection and try again.");
      setView({ name: "list" });
    }
  };

  if (view.name === "practice") {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            back.current = true;
            refresh();
          }}
          className="mb-4 rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-subtle"
        >
          ← All mistakes
        </button>
        <Quiz questions={view.questions} scope={view.label} showTopic />
      </div>
    );
  }

  const total = recent.length;
  const busy = view.name === "fetching";
  return (
    <section className="quiz" data-ready={view.name !== "loading"} aria-label="My mistakes">
      <p className="sr-only" aria-live="polite">
        {busy ? `Loading ${plural(view.count, "question")}…` : ""}
      </p>
      <div className="quiz-stage">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad"
          >
            {error}
          </p>
        )}
        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6">
            <h2 ref={headingRef} tabIndex={-1} className="font-semibold outline-none">
              Nothing to revisit
            </h2>
            <p className="mt-2 text-muted">
              Questions you answer wrong — in practice or in a test — collect here until you get
              them right.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href={url()}
                className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
              >
                Pick a topic
              </a>
              <a
                href={mixedExamUrl()}
                className="rounded-lg border border-line-strong px-4 py-2 font-medium hover:bg-subtle"
              >
                Take a mixed test
              </a>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs sm:p-6">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-semibold tracking-tight tabular-nums outline-none sm:text-2xl"
              >
                {plural(total, "question")} to revisit
              </h2>
              <p className="mt-2 text-muted">
                Your latest answer to these was wrong. Answer one correctly and it leaves the list.
                {total > MISTAKES_PER_ROUND &&
                  ` Rounds take the ${MISTAKES_PER_ROUND} most recent mistakes.`}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => practice(recent, "My mistakes")}
                className="mt-5 rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? "Loading questions…"
                  : total > MISTAKES_PER_ROUND
                    ? `Practice the ${MISTAKES_PER_ROUND} most recent`
                    : `Practice all ${total}`}
              </button>
            </section>

            <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">
              By topic
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
              {groups.map((g) => (
                <li
                  key={g.topic.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <a href={g.topic.url} className="font-medium hover:text-accent">
                      {g.topic.title}
                    </a>
                    <span className="block text-xs text-muted">{g.domainTitle}</span>
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {plural(g.ids.length, "question")}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => practice(g.ids, `My mistakes: ${g.topic.title}`)}
                    className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-subtle disabled:opacity-50"
                  >
                    Practice<span className="sr-only"> {g.topic.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
