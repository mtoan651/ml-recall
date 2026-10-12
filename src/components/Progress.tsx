import { type ReactNode, useEffect, useState } from "react";
import {
  attemptPercents,
  type DomainProgress,
  mistakesOf,
  progressOf,
  scopeTitle,
} from "../lib/catalog";
import { describeAttempt, type ExamHistory, lastAttempt, percentOf } from "../lib/exam";
import { loadAllExamHistory, loadResults } from "../lib/storage";
import type { Catalog } from "../lib/types";
import { mistakesUrl, mixedExamUrl, tagExamUrl, topicExamUrl, url } from "../lib/url";

interface OtherScope {
  scope: string;
  title: string;
  href?: string;
  history: ExamHistory;
}

/**
 * Progress from this browser's storage: per topic, how many questions were answered, how many
 * correctly, how many to revisit, and the timed-test history (last, best, trend of the last 10).
 */
export default function Progress({ catalog }: { catalog: Catalog }) {
  const [ready, setReady] = useState(false);
  const [domains, setDomains] = useState<DomainProgress[]>(() => progressOf(catalog, {}, {}));
  const [others, setOthers] = useState<OtherScope[]>([]);
  const [revisit, setRevisit] = useState(0);
  const [tests, setTests] = useState(0);

  useEffect(() => {
    const results = loadResults();
    const histories = loadAllExamHistory();
    setDomains(progressOf(catalog, results, histories));
    setRevisit(mistakesOf(catalog, results).length);
    setTests(Object.values(histories).reduce((n, h) => n + h.attempts.length, 0));
    setOthers(
      Object.entries(histories)
        .filter(([scope]) => !scope.startsWith("topic:"))
        .map(([scope, history]) => {
          const [kind, ...rest] = scope.split(":");
          const id = rest.join(":");
          const href =
            kind === "tag" ? tagExamUrl(id) : kind === "mixed" ? mixedExamUrl() : undefined;
          return { scope, title: scopeTitle(scope, catalog), history, ...(href ? { href } : {}) };
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    );
    setReady(true);
  }, [catalog]);

  const rows = domains.flatMap((d) => d.topics);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const answered = rows.reduce((n, r) => n + r.answered, 0);
  const correct = rows.reduce((n, r) => n + r.correct, 0);
  const empty = answered === 0 && tests === 0;

  return (
    <section className="quiz" data-ready={ready} aria-label="Progress">
      <div className="quiz-stage">
        {empty ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6">
            <h2 className="font-semibold">No progress yet</h2>
            <p className="mt-2 text-muted">
              Answer questions or take a test — your results are kept in this browser and summed up
              here.
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
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Answered" value={`${answered} / ${total}`}>
                {percentOf(answered, total)}% of the bank
              </Tile>
              <Tile label="Correct" value={String(correct)}>
                {answered > 0 ? `${percentOf(correct, answered)}% of answered` : "—"}
              </Tile>
              <Tile label="To revisit" value={String(revisit)}>
                {revisit > 0 ? (
                  <a
                    href={mistakesUrl()}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    Practice them
                  </a>
                ) : (
                  "nothing wrong lately"
                )}
              </Tile>
              <Tile label="Recent tests" value={String(tests)}>
                last 10 per topic, tag or mix
              </Tile>
            </dl>

            {domains.map((domain) => {
              const active = domain.topics.filter((t) => t.answered > 0 || t.history.best);
              if (active.length === 0) return null;
              const done = domain.topics.reduce((n, t) => n + t.answered, 0);
              const all = domain.topics.reduce((n, t) => n + t.total, 0);
              return (
                <section key={domain.id} aria-labelledby={`p-${domain.id}`} className="mt-8">
                  <h2
                    id={`p-${domain.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-semibold tracking-wide text-muted uppercase"
                  >
                    {domain.title}
                    <span className="font-normal tracking-normal normal-case tabular-nums">
                      {done} / {all} answered
                    </span>
                  </h2>
                  <ScoreTable
                    rows={active.map((t) => ({
                      key: t.topic.id,
                      title: t.topic.title,
                      href: t.topic.url,
                      testHref: topicExamUrl(t.topic.id),
                      total: t.total,
                      answered: t.answered,
                      correct: t.correct,
                      mistakes: t.mistakes,
                      history: t.history,
                    }))}
                  />
                </section>
              );
            })}

            {others.length > 0 && (
              <section aria-labelledby="p-other" className="mt-8">
                <h2
                  id="p-other"
                  className="text-sm font-semibold tracking-wide text-muted uppercase"
                >
                  Tag and mixed tests
                </h2>
                <ScoreTable
                  rows={others.map((o) => ({
                    key: o.scope,
                    title: o.title,
                    ...(o.href ? { testHref: o.href } : {}),
                    history: o.history,
                  }))}
                />
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3.5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted">{children}</dd>
    </div>
  );
}

interface ScoreRow {
  key: string;
  title: string;
  href?: string;
  testHref?: string;
  total?: number;
  answered?: number;
  correct?: number;
  mistakes?: number;
  history: ExamHistory;
}

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  const practice = rows.some((r) => r.total !== undefined);
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th scope="col" className="px-3.5 py-2 font-medium">
              {practice ? "Topic" : "Test"}
            </th>
            {practice && (
              <>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Answered
                </th>
                <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
                  Correct
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Revisit
                </th>
              </>
            )}
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Last test
            </th>
            <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
              Best
            </th>
            <th scope="col" className="hidden px-3.5 py-2 font-medium sm:table-cell">
              Last 10 tests
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line tabular-nums">
          {rows.map((r) => {
            const last = lastAttempt(r.history);
            return (
              <tr key={r.key}>
                <th scope="row" className="px-3.5 py-2.5 font-medium">
                  {r.href ? (
                    <a href={r.href} className="hover:text-accent">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                </th>
                {practice && (
                  <>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      {r.answered} <span className="text-muted">/ {r.total}</span>
                    </td>
                    <td className="hidden px-2 py-2.5 text-right sm:table-cell">{r.correct}</td>
                    <td
                      className={`px-2 py-2.5 text-right ${r.mistakes ? "text-bad" : "text-muted"}`}
                    >
                      {r.mistakes}
                    </td>
                  </>
                )}
                <td className="px-2 py-2.5 text-right whitespace-nowrap">
                  {last ? (
                    `${percentOf(last.correct, last.total)}%`
                  ) : r.testHref ? (
                    <a href={r.testHref} className="text-accent hover:underline">
                      Take one
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-2 py-2.5 text-right whitespace-nowrap sm:table-cell">
                  {r.history.best ? describeAttempt(r.history.best) : "—"}
                </td>
                <td className="hidden px-3.5 py-2.5 sm:table-cell">
                  <Trend values={attemptPercents(r.history)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Bars for the percentage of each recent test, oldest on the left. */
function Trend({ values }: { values: Array<{ at: number; percent: number }> }) {
  if (values.length === 0) return <span className="text-muted">—</span>;
  const w = 7;
  const gap = 3;
  const h = 22;
  return (
    <>
      <svg
        aria-hidden="true"
        width={values.length * (w + gap) - gap}
        height={h}
        className="block text-accent"
      >
        {values.map(({ at, percent }, i) => {
          const bar = Math.max(2, (percent / 100) * h);
          return (
            <rect
              key={at}
              x={i * (w + gap)}
              y={h - bar}
              width={w}
              height={bar}
              rx={1.5}
              fill="currentColor"
              opacity={0.35 + 0.65 * ((i + 1) / values.length)}
            />
          );
        })}
      </svg>
      <span className="sr-only">
        Recent test scores: {values.map((v) => `${v.percent}%`).join(", ")}
      </span>
    </>
  );
}
