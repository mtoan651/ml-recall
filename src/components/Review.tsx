import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { Card, Grade } from "ts-fsrs";
import { catalogEntries, groupIdsByTopic, type MistakeGroup } from "../lib/catalog";
import { fetchQuestions } from "../lib/fetch";
import { msg, type Params } from "../lib/i18n";
import type { Outcome } from "../lib/session";
import {
  type Cards,
  dueIds,
  forecast,
  formatInterval,
  GRADES,
  isMature,
  loadCards,
  previewDays,
  rateAnswer,
  saveCards,
  withBackfill,
} from "../lib/srs";
import { browserStore, loadResults } from "../lib/storage";
import type { Catalog, QuizQuestion } from "../lib/types";
import { url } from "../lib/url";
import { useT } from "../lib/use-lang";
import Quiz from "./Quiz";
import { DomainTitle, TopicTitle } from "./Title";

/** One review round holds at most this many questions, the most overdue first. */
export const REVIEW_PER_ROUND = 50;

type View =
  | { name: "loading" }
  | { name: "overview" }
  | { name: "fetching"; count: number }
  | { name: "session"; questions: QuizQuestion[]; label: Label };

/** What is being reviewed, kept as a key so it follows a change of language. */
interface Label {
  key: string;
  params?: Params;
}

interface Overview {
  cards: Cards;
  due: string[];
  groups: MistakeGroup[];
  next: number[];
  tracked: number;
  mature: number;
}

const RATINGS: Array<{ key: "hard" | "good" | "easy"; label: string }> = [
  { key: "hard", label: msg("Hard") },
  { key: "good", label: msg("Good") },
  { key: "easy", label: msg("Easy") },
];

/**
 * Spaced repetition: every answered question has an FSRS card (src/lib/srs.ts); this page
 * practises the ones due today, most overdue first, and lets a right answer be rated Hard,
 * Good (the default, already recorded) or Easy.
 */
export default function Review({ catalog }: { catalog: Catalog }) {
  const t = useT();
  const [view, setView] = useState<View>({ name: "loading" });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  /** Cards as they were when the round started: the base for re-rating an answer. */
  const before = useRef<Cards>({});
  const [rated, setRated] = useState<Record<string, Grade>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const back = useRef(false);

  const refresh = useCallback(() => {
    const store = browserStore();
    const known = new Set(catalogEntries(catalog).map((e) => e.id));
    const { cards, added } = withBackfill(loadCards(store), loadResults(store));
    if (added > 0) saveCards(cards, store);
    const now = Date.now();
    const due = dueIds(cards, now, known);
    const ids = Object.keys(cards).filter((id) => known.has(id));
    setOverview({
      cards,
      due,
      groups: groupIdsByTopic(catalog, due),
      next: forecast(cards, now, 7, known),
      tracked: ids.length,
      mature: ids.filter((id) => cards[id] && isMature(cards[id])).length,
    });
    setView({ name: "overview" });
  }, [catalog]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (view.name === "overview" && back.current) {
      back.current = false;
      headingRef.current?.focus();
    }
  }, [view.name]);

  const start = async (ids: string[], label: Label) => {
    const round = ids.slice(0, REVIEW_PER_ROUND);
    setError("");
    setView({ name: "fetching", count: round.length });
    try {
      const questions = await fetchQuestions(round);
      before.current = loadCards(browserStore());
      setRated({});
      setView({ name: "session", questions, label });
      window.scrollTo({ top: 0 });
    } catch {
      setError(msg("Could not load the questions. Check your connection and try again."));
      setView({ name: "overview" });
    }
  };

  const rate = (id: string, grade: Grade) => {
    rateAnswer(id, before.current[id], Date.now(), grade, browserStore());
    setRated((r) => ({ ...r, [id]: grade }));
  };

  const ratingControls = (id: string, outcome: Outcome): ReactNode => {
    const card: Card | undefined = before.current[id];
    if (outcome !== "correct") {
      return (
        <p className="text-sm text-muted">
          {t.rich("Marked {again}: it comes back tomorrow.", {
            again: <span className="font-medium text-ink">{t("Again")}</span>,
          })}
        </p>
      );
    }
    const chosen = rated[id] ?? GRADES.good;
    const now = Date.now();
    return (
      <fieldset className="flex flex-wrap items-center gap-2 text-sm">
        <legend className="sr-only">{t("How easy was it?")}</legend>
        <span className="mr-1 text-muted" aria-hidden="true">
          {t("How easy was it?")}
        </span>
        {RATINGS.map(({ key, label }) => {
          const grade = GRADES[key];
          const on = chosen === grade;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => rate(id, grade)}
              className={`rounded-lg border px-3 py-1.5 transition-colors ${
                on
                  ? "border-accent bg-accent-soft font-medium"
                  : "border-line hover:border-line-strong hover:bg-subtle"
              }`}
            >
              {t(label)}{" "}
              <span className="text-muted tabular-nums">
                ≈ {formatInterval(previewDays(card, now, grade), t.lang)}
              </span>
            </button>
          );
        })}
      </fieldset>
    );
  };

  if (view.name === "session") {
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
          {t("← Review")}
        </button>
        <Quiz
          questions={view.questions}
          scope={t(view.label.key, view.label.params)}
          showTopic
          rating={ratingControls}
        />
      </div>
    );
  }

  const o = overview;
  const busy = view.name === "fetching";
  const due = o?.due.length ?? 0;
  return (
    <section
      className="quiz"
      data-ready={view.name !== "loading"}
      data-lang={t.lang}
      aria-label={t("Review")}
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
        {o && o.tracked === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6">
            <h2 ref={headingRef} tabIndex={-1} className="font-semibold outline-none">
              {t("Nothing to review yet")}
            </h2>
            <p className="mt-2 text-muted">
              {t(
                "Every question you answer — in practice, a test or My mistakes — comes back here just before you would forget it: a wrong one tomorrow, a right one after a growing interval.",
              )}
            </p>
            <a
              href={url()}
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
            >
              {t("Pick a topic")}
            </a>
          </div>
        ) : (
          <>
            <section
              aria-labelledby="review-heading"
              className="rounded-2xl border border-line bg-surface p-4 shadow-xs sm:p-6"
            >
              <h2
                id="review-heading"
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-semibold tracking-tight tabular-nums outline-none sm:text-2xl"
              >
                {o
                  ? due > 0
                    ? t.n(due, "{n} question due", "{n} questions due")
                    : t("Nothing due today")
                  : " "}
              </h2>
              <p className="mt-2 text-muted">
                {t(
                  "Spaced repetition with FSRS: a question returns just before you would forget it. A wrong answer brings it back tomorrow; a right one pushes it further out each time.",
                )}
                {due > REVIEW_PER_ROUND &&
                  t(" A round has the {n} most overdue; start another after it.", {
                    n: REVIEW_PER_ROUND,
                  })}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                <button
                  type="button"
                  disabled={due === 0 || busy || !o}
                  onClick={() => o && start(o.due, { key: msg("Review") })}
                  className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy
                    ? t("Loading questions…")
                    : due > 0
                      ? t("Review {n} now", { n: Math.min(due, REVIEW_PER_ROUND) })
                      : t("All caught up")}
                </button>
                {due === 0 && o && (
                  <a href={url()} className="text-sm text-accent hover:underline">
                    {t("Practise a topic meanwhile")}
                  </a>
                )}
              </div>
            </section>

            {o && (
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label={t("Due today")} value={t.num(due)} />
                <Tile label={t("Tomorrow")} value={t.num(o.next[0] ?? 0)} />
                <Tile label={t("Next 7 days")} value={t.num(o.next.reduce((a, b) => a + b, 0))} />
                <Tile label={t("Tracked")} value={t.num(o.tracked)}>
                  {t("{n} mature (≥ 21 days)", { n: o.mature })}
                </Tile>
              </dl>
            )}

            {o?.next.some((n) => n > 0) && <Forecast counts={o.next} />}

            {o && o.groups.length > 0 && (
              <section aria-labelledby="due-topics" className="mt-8">
                <h2 id="due-topics" className="font-semibold">
                  {t("Due by topic")}
                </h2>
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                  {o.groups.map((g) => (
                    <li
                      key={g.topic.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <a href={g.topic.url} className="font-medium hover:underline">
                          <TopicTitle id={g.topic.id} en={g.topic.title} />
                        </a>
                        <span className="ml-2 text-xs text-muted">
                          <DomainTitle id={g.domainId} en={g.domainTitle} />
                        </span>
                      </span>
                      <span className="text-sm text-muted tabular-nums">
                        {t("{n} due", { n: g.ids.length })}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          start(g.ids, {
                            key: "{title}",
                            params: { title: { topic: g.topic.id, en: g.topic.title } },
                          })
                        }
                        className="rounded-lg px-2.5 py-1 text-sm font-medium text-accent hover:bg-subtle disabled:opacity-50"
                      >
                        {t("Review")}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3.5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
      {children && <dd className="mt-0.5 text-xs text-muted">{children}</dd>}
    </div>
  );
}

/** Bars: questions falling due on each of the next 7 days. */
function Forecast({ counts }: { counts: number[] }) {
  const t = useT();
  const max = Math.max(1, ...counts);
  const today = new Date();
  const day = (i: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    return d.toLocaleDateString(t.lang === "vi" ? "vi-VN" : "en", { weekday: "short" });
  };
  return (
    <section aria-labelledby="forecast-heading" className="mt-8">
      <h2 id="forecast-heading" className="font-semibold">
        {t("Coming up")}
      </h2>
      <ol className="mt-3 grid grid-cols-7 items-end gap-2" aria-label={t("Questions due per day")}>
        {counts.map((n, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one fixed slot per upcoming day.
          <li key={i} className="flex flex-col items-center gap-1 text-xs">
            <span aria-hidden="true" className="text-muted tabular-nums">
              {n}
            </span>
            <span
              aria-hidden="true"
              className="block w-full max-w-10 rounded-t-md bg-accent/70"
              style={{ height: `${Math.max(2, (n / max) * 64)}px` }}
            />
            <span className="text-muted">
              <span className="sr-only">{t("{n} due on {day}", { n, day: day(i) })}</span>
              <span aria-hidden="true">{day(i)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
