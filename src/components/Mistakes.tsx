import { useCallback, useEffect, useRef, useState } from "react";
import { MISTAKES_PER_ROUND, type MistakeGroup, mistakesByTopic, mistakesOf } from "../lib/catalog";
import { fetchQuestions } from "../lib/fetch";
import { msg, type Params } from "../lib/i18n";
import { loadResults } from "../lib/storage";
import type { Catalog, QuizQuestion } from "../lib/types";
import { mixedExamUrl, url } from "../lib/url";
import { useT } from "../lib/use-lang";
import Quiz from "./Quiz";
import { DomainTitle, TopicTitle } from "./Title";

/** What is being practised, kept as a key so it follows a change of language. */
interface Label {
  key: string;
  params?: Params;
}

type View =
  | { name: "loading" }
  | { name: "list" }
  | { name: "fetching"; count: number }
  | { name: "practice"; questions: QuizQuestion[]; label: Label };

/**
 * "My mistakes": every question whose latest answer (practice or test) was wrong, grouped by
 * topic. Practicing one fetches those questions and runs the usual quiz; a question leaves the
 * deck once it is answered correctly.
 */
export default function Mistakes({ catalog }: { catalog: Catalog }) {
  const t = useT();
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

  const practice = async (ids: string[], label: Label) => {
    const round = ids.slice(0, MISTAKES_PER_ROUND);
    setError("");
    setView({ name: "fetching", count: round.length });
    try {
      const questions = await fetchQuestions(round);
      setView({ name: "practice", questions, label });
      window.scrollTo({ top: 0 });
    } catch {
      setError(msg("Could not load the questions. Check your connection and try again."));
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
          {t("← All mistakes")}
        </button>
        <Quiz questions={view.questions} scope={t(view.label.key, view.label.params)} showTopic />
      </div>
    );
  }

  const total = recent.length;
  const busy = view.name === "fetching";
  return (
    <section
      className="quiz"
      data-ready={view.name !== "loading"}
      data-lang={t.lang}
      aria-label={t("My mistakes")}
    >
      <p className="sr-only" aria-live="polite">
        {busy ? t.n(view.count, "Loading {n} question…", "Loading {n} questions…") : ""}
      </p>
      <div className="quiz-stage">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad"
          >
            {t(error)}
          </p>
        )}
        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6">
            <h2 ref={headingRef} tabIndex={-1} className="font-semibold outline-none">
              {t("Nothing to revisit")}
            </h2>
            <p className="mt-2 text-muted">
              {t(
                "Questions you answer wrong — in practice or in a test — collect here until you get them right.",
              )}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href={url()}
                className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
              >
                {t("Pick a topic")}
              </a>
              <a
                href={mixedExamUrl()}
                className="rounded-lg border border-line-strong px-4 py-2 font-medium hover:bg-subtle"
              >
                {t("Take a mixed test")}
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
                {t.n(total, "{n} question to revisit", "{n} questions to revisit")}
              </h2>
              <p className="mt-2 text-muted">
                {t(
                  "Your latest answer to these was wrong. Answer one correctly and it leaves the list.",
                )}
                {total > MISTAKES_PER_ROUND &&
                  t(" Rounds take the {n} most recent mistakes.", { n: MISTAKES_PER_ROUND })}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => practice(recent, { key: msg("My mistakes") })}
                className="mt-5 rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? t("Loading questions…")
                  : total > MISTAKES_PER_ROUND
                    ? t("Practice the {n} most recent", { n: MISTAKES_PER_ROUND })
                    : t("Practice all {n}", { n: total })}
              </button>
            </section>

            <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">
              {t("By topic")}
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
              {groups.map((g) => (
                <li
                  key={g.topic.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <a href={g.topic.url} className="font-medium hover:text-accent">
                      <TopicTitle id={g.topic.id} en={g.topic.title} />
                    </a>
                    <span className="block text-xs text-muted">
                      <DomainTitle id={g.domainId} en={g.domainTitle} />
                    </span>
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {t.n(g.ids.length, "{n} question", "{n} questions")}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      practice(g.ids, {
                        key: msg("My mistakes: {title}"),
                        params: { title: { topic: g.topic.id, en: g.topic.title } },
                      })
                    }
                    className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-subtle disabled:opacity-50"
                  >
                    {t("Practice")}
                    <span className="sr-only">
                      {" "}
                      {t.title({ topic: g.topic.id, en: g.topic.title })}
                    </span>
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
