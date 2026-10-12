import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  BackupError,
  backupFileName,
  createBackup,
  type MergeSummary,
  mergeBackup,
  parseBackup,
} from "../lib/backup";
import {
  attemptPercents,
  type DomainProgress,
  mistakesOf,
  progressOf,
  scopeTitle,
} from "../lib/catalog";
import { describeAttempt, type ExamHistory, lastAttempt, percentOf } from "../lib/exam";
import { msg } from "../lib/i18n";
import { browserStore, loadAllExamHistory, loadResults } from "../lib/storage";
import type { Catalog } from "../lib/types";
import { mistakesUrl, mixedExamUrl, tagExamUrl, topicExamUrl, url } from "../lib/url";
import { type Translator, useT } from "../lib/use-lang";
import { DomainTitle, TopicTitle } from "./Title";

interface OtherScope {
  scope: string;
  /** "#tag", or the key "Mixed tests". */
  title: string;
  href?: string;
  history: ExamHistory;
}

/**
 * Progress from this browser's storage: per topic, how many questions were answered, how many
 * correctly, how many to revisit, and the timed-test history (last, best, trend of the last 10).
 */
export default function Progress({ catalog }: { catalog: Catalog }) {
  const t = useT();
  const [ready, setReady] = useState(false);
  const [domains, setDomains] = useState<DomainProgress[]>(() => progressOf(catalog, {}, {}));
  const [others, setOthers] = useState<OtherScope[]>([]);
  const [revisit, setRevisit] = useState(0);
  const [tests, setTests] = useState(0);

  const load = useCallback(() => {
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
          const title = kind === "mixed" ? msg("Mixed tests") : scopeTitle(scope, catalog);
          return { scope, title, history, ...(href ? { href } : {}) };
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    );
    setReady(true);
  }, [catalog]);

  useEffect(load, [load]);

  const rows = domains.flatMap((d) => d.topics);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const answered = rows.reduce((n, r) => n + r.answered, 0);
  const correct = rows.reduce((n, r) => n + r.correct, 0);
  const empty = answered === 0 && tests === 0;

  return (
    <section className="quiz" data-ready={ready} data-lang={t.lang} aria-label={t("Progress")}>
      <div className="quiz-stage">
        {empty ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6">
            <h2 className="font-semibold">{t("No progress yet")}</h2>
            <p className="mt-2 text-muted">
              {t(
                "Answer questions or take a test — your results are kept in this browser and summed up here.",
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
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label={t("Answered")} value={`${t.num(answered)} / ${t.num(total)}`}>
                {t("{p}% of the bank", { p: percentOf(answered, total) })}
              </Tile>
              <Tile label={t("Correct")} value={t.num(correct)}>
                {answered > 0 ? t("{p}% of answered", { p: percentOf(correct, answered) }) : "—"}
              </Tile>
              <Tile label={t("To revisit")} value={t.num(revisit)}>
                {revisit > 0 ? (
                  <a
                    href={mistakesUrl()}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {t("Practice them")}
                  </a>
                ) : (
                  t("nothing wrong lately")
                )}
              </Tile>
              <Tile label={t("Recent tests")} value={t.num(tests)}>
                {t("last 10 per topic, tag or mix")}
              </Tile>
            </dl>

            {domains.map((domain) => {
              const active = domain.topics.filter((row) => row.answered > 0 || row.history.best);
              if (active.length === 0) return null;
              const done = domain.topics.reduce((n, row) => n + row.answered, 0);
              const all = domain.topics.reduce((n, row) => n + row.total, 0);
              return (
                <section key={domain.id} aria-labelledby={`p-${domain.id}`} className="mt-8">
                  <h2
                    id={`p-${domain.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-semibold tracking-wide text-muted uppercase"
                  >
                    <span>
                      <DomainTitle id={domain.id} en={domain.title} />
                    </span>
                    <span className="font-normal tracking-normal normal-case tabular-nums">
                      {t("{done} / {all} answered", { done, all })}
                    </span>
                  </h2>
                  <ScoreTable
                    rows={active.map((row) => ({
                      key: row.topic.id,
                      title: <TopicTitle id={row.topic.id} en={row.topic.title} />,
                      href: row.topic.url,
                      testHref: topicExamUrl(row.topic.id),
                      total: row.total,
                      answered: row.answered,
                      correct: row.correct,
                      mistakes: row.mistakes,
                      history: row.history,
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
                  {t("Tag and mixed tests")}
                </h2>
                <ScoreTable
                  rows={others.map((o) => ({
                    key: o.scope,
                    title: t(o.title),
                    ...(o.href ? { testHref: o.href } : {}),
                    history: o.history,
                  }))}
                />
              </section>
            )}
          </>
        )}
        <BackupPanel onImported={load} />
      </div>
    </section>
  );
}

function describeMerge(t: Translator, s: MergeSummary): string {
  const parts = [
    s.results > 0 && t.n(s.results, "{n} answer", "{n} answers"),
    s.cards > 0 && t.n(s.cards, "{n} review card", "{n} review cards"),
    s.tests > 0 && t.n(s.tests, "{n} test", "{n} tests"),
    s.preferences > 0 && t("your settings"),
  ].filter(Boolean);
  return parts.length > 0
    ? t("Imported {what}. Newer progress already here was kept.", { what: parts.join(", ") })
    : t("Nothing new in that file — everything in it is already here (or older).");
}

/** A status line, rendered in the current language (it may stay while the language changes). */
interface Status {
  ok: boolean;
  text: (t: Translator) => string;
}

/** Export everything to a JSON file; import one, merged into this browser's progress. */
function BackupPanel({ onImported }: { onImported: () => void }) {
  const t = useT();
  const [message, setMessage] = useState<Status | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const now = Date.now();
    const blob = new Blob([JSON.stringify(createBackup(browserStore(), now))], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = backupFileName(now);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    const file = a.download;
    setMessage({ ok: true, text: (t) => t("Saved {file}.", { file }) });
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const summary = mergeBackup(parseBackup(await file.text()), browserStore());
      setMessage({ ok: true, text: (t) => describeMerge(t, summary) });
      onImported();
    } catch (e) {
      const key = e instanceof BackupError ? e.message : msg("That file could not be read.");
      setMessage({ ok: false, text: (t) => t(key) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section
      aria-labelledby="p-backup"
      className="mt-10 rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <h2 id="p-backup" className="font-semibold">
        {t("Back up or move your progress")}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t(
          "Everything lives only in this browser. Export it to a file to keep a copy or to open it on another device; importing merges the file into what is here (the newer answer per question wins), so it never overwrites recent work.",
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={download}
          className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:bg-subtle"
        >
          {t("Export progress")}
        </button>
        <label className="cursor-pointer rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:bg-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          {t("Import progress…")}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-good" : "text-bad"}`}>
          {message.text(t)}
        </p>
      )}
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
  title: ReactNode;
  href?: string;
  testHref?: string;
  total?: number;
  answered?: number;
  correct?: number;
  mistakes?: number;
  history: ExamHistory;
}

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  const t = useT();
  const practice = rows.some((r) => r.total !== undefined);
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th scope="col" className="px-3.5 py-2 font-medium">
              {practice ? t("Topic") : t("Test")}
            </th>
            {practice && (
              <>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  {t("Answered")}
                </th>
                <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
                  {t("Correct")}
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  {t("Revisit")}
                </th>
              </>
            )}
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {t("Last test")}
            </th>
            <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
              {t("Best")}
            </th>
            <th scope="col" className="hidden px-3.5 py-2 font-medium sm:table-cell">
              {t("Last 10 tests")}
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
                      {t("Take one")}
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
  const t = useT();
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
        {t("Recent test scores: {scores}", {
          scores: values.map((v) => `${v.percent}%`).join(", "),
        })}
      </span>
    </>
  );
}
