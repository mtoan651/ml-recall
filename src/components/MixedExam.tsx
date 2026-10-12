import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  catalogEntries,
  DEFAULT_MIXED_SIZE,
  DIFFICULTIES,
  decodeTags,
  drawIds,
  MIXED_SIZES,
  selectionPool,
  type TagCount,
  tagCounts,
} from "../lib/catalog";
import {
  DEFAULT_EXAM_LAYOUT,
  EMPTY_HISTORY,
  type ExamHistory,
  type ExamLayout,
  examScope,
  lastAttempt,
  MIXED_ID,
  planExam,
  type StoredQuestionInfo,
} from "../lib/exam";
import { fetchQuestions } from "../lib/fetch";
import {
  clearExam,
  loadExam,
  loadExamHistory,
  loadMixedPrefs,
  loadSettings,
  saveMixedPrefs,
  saveSettings,
  storedExamIds,
} from "../lib/storage";
import type { Catalog, CatalogTags, Difficulty, ExamScopeView, QuizQuestion } from "../lib/types";
import { mistakesUrl } from "../lib/url";
import Exam from "./Exam";
import { AttemptTile, LayoutPicker } from "./ExamStart";
import { ClockIcon } from "./Icons";

const SCOPE = examScope("mixed", MIXED_ID);
const SCOPE_VIEW: ExamScopeView = {
  kind: "mixed",
  id: MIXED_ID,
  title: "your selection",
  practiceUrl: mistakesUrl(),
  practiceLabel: "Practice your mistakes",
};
const LOAD_FAILED =
  "Could not load the questions. Check your connection and try again — nothing was started.";
const RESUME_FAILED =
  "Your unfinished mixed test could not be resumed (the site has changed since), so it was closed.";

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en")} ${n === 1 ? word : `${word}s`}`;

type View =
  | { name: "loading" }
  | { name: "builder" }
  | { name: "fetching"; count: number }
  | { name: "exam"; questions: QuizQuestion[]; size: number; resume: boolean };

const infoOf = (q: QuizQuestion): StoredQuestionInfo => ({
  type: q.type,
  optionCount: q.options?.length ?? 0,
  blankCount: q.answer?.blanks?.length ?? 0,
});

/** Tags offered as one-click suggestions. */
const SUGGESTED_TAGS = 8;

/**
 * Mixed test: choose topics, tags, difficulties and a length, then a timed test draws from all
 * of them. The page embeds only the question index and the tag index; the drawn questions are
 * fetched, then the usual `Exam` runs (scope `mixed:custom`, its own history and test in
 * progress). `?tag=<tag>` (from a tag page) starts the form with that tag and every topic.
 */
export default function MixedExam({ catalog, tags }: { catalog: Catalog; tags: CatalogTags }) {
  const allTopics = useMemo(
    () => catalog.domains.flatMap((d) => d.topics.map((t) => t.id)),
    [catalog],
  );
  const entries = useMemo(() => catalogEntries(catalog), [catalog]);
  const tagIndex = useMemo(() => decodeTags(tags), [tags]);
  const counts = useMemo(() => tagCounts(tagIndex), [tagIndex]);
  const [view, setView] = useState<View>({ name: "loading" });
  const [topics, setTopics] = useState<ReadonlySet<string>>(() => new Set(allTopics));
  const [chosenTags, setChosenTags] = useState<readonly string[]>([]);
  const [difficulties, setDifficulties] = useState<ReadonlySet<Difficulty>>(
    () => new Set(DIFFICULTIES),
  );
  const [size, setSize] = useState(DEFAULT_MIXED_SIZE);
  const [layout, setLayout] = useState<ExamLayout>(DEFAULT_EXAM_LAYOUT);
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [history, setHistory] = useState<ExamHistory>(EMPTY_HISTORY);
  const [notice, setNotice] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const toBuilder = useCallback((message = "") => {
    setHistory(loadExamHistory(SCOPE));
    setNotice(message);
    setView({ name: "builder" });
  }, []);

  // Restore the form, then resume a test in progress (its questions must be fetched first).
  useEffect(() => {
    const prefs = loadMixedPrefs();
    const knownTag = (t: string) => tagIndex.has(t);
    if (prefs) {
      const known = new Set(allTopics);
      setTopics(new Set(prefs.topics.filter((t) => known.has(t))));
      setChosenTags(prefs.tags.filter(knownTag));
      setDifficulties(new Set(prefs.difficulties));
      if (MIXED_SIZES.includes(prefs.size)) setSize(prefs.size);
    }
    // A link from a tag page: that tag over everything, remembered like a choice on the form.
    const linked = new URLSearchParams(window.location.search).get("tag");
    if (linked !== null) {
      if (knownTag(linked)) {
        setTopics(new Set(allTopics));
        setChosenTags([linked]);
        setDifficulties(new Set(DIFFICULTIES));
        saveMixedPrefs({
          topics: allTopics,
          tags: [linked],
          difficulties: [...DIFFICULTIES],
          size: prefs && MIXED_SIZES.includes(prefs.size) ? prefs.size : DEFAULT_MIXED_SIZE,
        });
      }
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    const settings = loadSettings();
    setLayout(settings.examLayout);
    setReviewedOnly(settings.reviewedOnly);
    const ids = storedExamIds(SCOPE);
    if (!ids) {
      toBuilder();
      return;
    }
    let cancelled = false;
    setView({ name: "fetching", count: ids.length });
    fetchQuestions(ids)
      .then((questions) => {
        if (cancelled) return;
        const info = new Map(questions.map((q) => [q.id, infoOf(q)]));
        if (!loadExam(SCOPE, info)) {
          clearExam(SCOPE);
          toBuilder(RESUME_FAILED);
          return;
        }
        setView({ name: "exam", questions, size: questions.length, resume: true });
      })
      .catch(() => {
        if (cancelled) return;
        // Offline: keep the stored test so a reload can resume it later.
        toBuilder("Your unfinished mixed test could not be loaded right now. Reload to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [allTopics, tagIndex, toBuilder]);

  const selection = useMemo(
    () => ({
      topics: [...topics],
      tags: chosenTags,
      difficulties: [...difficulties],
      reviewedOnly,
    }),
    [topics, chosenTags, difficulties, reviewedOnly],
  );
  const pool = useMemo(
    () => selectionPool(catalog, selection, tagIndex),
    [catalog, selection, tagIndex],
  );
  const plan = planExam(pool.length, size);
  const draftsInSelection = useMemo(() => {
    const chosen = new Set(selectionPool(catalog, { ...selection, reviewedOnly: false }, tagIndex));
    return entries.filter((e) => chosen.has(e.id) && !e.reviewed).length;
  }, [catalog, entries, selection, tagIndex]);
  // Questions per difficulty within the chosen topics and tags (those without one not counted).
  const perDifficulty = useMemo(() => {
    const count = (d: Difficulty) =>
      selectionPool(catalog, { ...selection, difficulties: [d] }, tagIndex).length;
    return { easy: count("easy"), medium: count("medium"), hard: count("hard") };
  }, [catalog, selection, tagIndex]);

  const remember = (
    next: Partial<{
      topics: ReadonlySet<string>;
      tags: readonly string[];
      difficulties: ReadonlySet<Difficulty>;
      size: number;
    }>,
  ) => {
    saveMixedPrefs({
      topics: [...(next.topics ?? topics)],
      tags: [...(next.tags ?? chosenTags)],
      difficulties: [...(next.difficulties ?? difficulties)],
      size: next.size ?? size,
    });
  };
  const changeTopics = (next: ReadonlySet<string>) => {
    setTopics(next);
    remember({ topics: next });
  };
  const changeTags = (next: readonly string[]) => {
    setChosenTags(next);
    remember({ tags: next });
  };
  const toggleDifficulty = (d: Difficulty) => {
    const next = new Set(difficulties);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setDifficulties(next);
    remember({ difficulties: next });
  };
  const changeSize = (n: number) => {
    setSize(n);
    remember({ size: n });
  };
  const changeLayout = (value: ExamLayout) => {
    setLayout(value);
    saveSettings({ ...loadSettings(), examLayout: value });
  };
  const changeReviewedOnly = (value: boolean) => {
    setReviewedOnly(value);
    saveSettings({ ...loadSettings(), reviewedOnly: value });
  };

  const start = async () => {
    const ids = drawIds(pool, plan.count);
    if (ids.length === 0) return;
    setNotice("");
    setView({ name: "fetching", count: ids.length });
    try {
      const questions = await fetchQuestions(ids);
      setView({ name: "exam", questions, size: ids.length, resume: false });
    } catch {
      toBuilder(LOAD_FAILED);
    }
  };

  // Focus the form heading when coming back from a test.
  const previous = useRef(view.name);
  useEffect(() => {
    if (view.name === "builder" && previous.current === "exam") headingRef.current?.focus();
    previous.current = view.name;
  }, [view.name]);

  if (view.name === "exam") {
    return (
      <Exam
        questions={view.questions}
        scope={SCOPE_VIEW}
        showTopic
        maxQuestions={view.size}
        autoStart={!view.resume}
        onNewTest={() => toBuilder()}
      />
    );
  }

  const ready = view.name !== "loading";
  const last = lastAttempt(history);
  return (
    <section className="quiz" data-ready={ready} aria-label="Mixed test">
      <p className="sr-only" aria-live="polite">
        {view.name === "fetching" ? `Loading ${plural(view.count, "question")}…` : ""}
      </p>
      <div className="quiz-stage">
        {notice && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-note/40 bg-note-soft px-4 py-3 text-sm text-note"
          >
            {notice}
          </p>
        )}
        <section
          aria-labelledby="mixed-heading"
          className="rounded-2xl border border-line bg-surface p-4 shadow-xs sm:p-6"
        >
          <h2
            id="mixed-heading"
            ref={headingRef}
            tabIndex={-1}
            className="flex items-center gap-2.5 text-xl font-semibold tracking-tight tabular-nums outline-none sm:text-2xl"
          >
            <ClockIcon className="size-6 shrink-0 text-accent" />
            {plan.count > 0
              ? `${plural(plan.count, "question")} · ${plural(plan.count, "minute")}`
              : "No questions selected"}
          </h2>
          <p className="mt-2 text-muted">
            Random questions from the topics, tags and difficulties you pick, a new set every time.
            No feedback until you submit; then every answer is explained.
          </p>

          <TopicPicker catalog={catalog} selected={topics} onChange={changeTopics} />

          <TagPicker counts={counts} selected={chosenTags} onChange={changeTags} ready={ready} />

          <fieldset className="mt-5 min-w-0">
            <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
              Difficulty
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <label
                  key={d}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
                    difficulties.has(d)
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:border-line-strong hover:bg-subtle"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={difficulties.has(d)}
                    onChange={() => toggleDifficulty(d)}
                  />
                  {d}
                  <span className="text-muted tabular-nums">{perDifficulty[d]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5 min-w-0">
            <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
              Length
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MIXED_SIZES.map((n) => (
                <label
                  key={n}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-colors ${
                    size === n
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:border-line-strong hover:bg-subtle"
                  }`}
                >
                  <input
                    type="radio"
                    name="mixed-size"
                    className="size-4"
                    checked={size === n}
                    onChange={() => changeSize(n)}
                  />
                  {n} questions
                </label>
              ))}
            </div>
          </fieldset>

          <LayoutPicker layout={layout} onLayout={changeLayout} className="mt-5" />

          {draftsInSelection > 0 && (
            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={reviewedOnly}
                onChange={(e) => changeReviewedOnly(e.target.checked)}
              />
              Reviewed questions only
            </label>
          )}

          <p className="mt-5 rounded-xl bg-subtle px-3.5 py-2.5 text-sm tabular-nums">
            {pool.length === 0
              ? topics.size > 0 && difficulties.size > 0 && chosenTags.length > 0
                ? "No questions match — the chosen tags have none in these topics and difficulties."
                : "No questions match — pick at least one topic and one difficulty."
              : plan.short
                ? `${plural(pool.length, "question")} match, so this test has ${plural(plan.count, "question")}.`
                : `${plural(pool.length, "question")} match; the test draws ${plan.count} of them.`}
          </p>

          {last && (
            <dl className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
              <AttemptTile label="Last mixed test" attempt={last} />
              {history.best && <AttemptTile label="Best" attempt={history.best} />}
            </dl>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              onClick={start}
              disabled={plan.count === 0 || view.name !== "builder"}
              className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {view.name === "fetching" ? "Loading questions…" : "Start test"}
            </button>
            <a
              href={mistakesUrl()}
              className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Practice your mistakes instead
            </a>
          </div>
        </section>
      </div>
    </section>
  );
}

/** Domains with a checkbox each (all / some / none of their topics), topics inside. */
function TopicPicker({
  catalog,
  selected,
  onChange,
}: {
  catalog: Catalog;
  selected: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
}) {
  const all = catalog.domains.flatMap((d) => d.topics.map((t) => t.id));
  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  };
  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="text-xs font-semibold tracking-wide text-muted uppercase">Topics</legend>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-muted tabular-nums">
          {selected.size} of {all.length} topics
        </span>
        <button
          type="button"
          onClick={() => onChange(new Set(all))}
          className="rounded-md px-1.5 py-0.5 font-medium text-accent hover:bg-subtle"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="rounded-md px-1.5 py-0.5 font-medium text-accent hover:bg-subtle"
        >
          Clear
        </button>
      </div>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
        {catalog.domains.map((domain) => {
          const ids = domain.topics.map((t) => t.id);
          const on = ids.filter((id) => selected.has(id)).length;
          const questions = domain.topics.reduce((n, t) => n + t.ids.length, 0);
          return (
            <li key={domain.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 hover:bg-subtle [&::-webkit-details-marker]:hidden">
                  <DomainCheckbox
                    label={domain.title}
                    state={on === 0 ? "none" : on === ids.length ? "all" : "some"}
                    onToggle={() => setMany(ids, on < ids.length)}
                  />
                  <span className="min-w-0 flex-1 font-medium">{domain.title}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {on}/{ids.length} · {questions}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-muted transition-transform group-open:rotate-90"
                  >
                    ›
                  </span>
                </summary>
                <div className="grid gap-x-4 gap-y-1 px-3.5 pt-0.5 pb-3 pl-10 sm:grid-cols-2">
                  {domain.topics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex cursor-pointer items-center gap-2 py-0.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0"
                        checked={selected.has(topic.id)}
                        onChange={(e) => setMany([topic.id], e.target.checked)}
                      />
                      <span className="min-w-0 flex-1">{topic.title}</span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {topic.ids.length}
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/**
 * Optional tag filter: a search box over every tag (native suggestions from a datalist), the
 * chosen tags as removable chips, and the largest tags as one-click suggestions.
 */
function TagPicker({
  counts,
  selected,
  onChange,
  ready,
}: {
  counts: readonly TagCount[];
  selected: readonly string[];
  onChange: (next: readonly string[]) => void;
  /** Hydrated: the suggestion list (thousands of options) is not server-rendered. */
  ready: boolean;
}) {
  const [query, setQuery] = useState("");
  const size = useMemo(() => new Map(counts.map((c) => [c.tag, c.count])), [counts]);
  const add = (tag: string) => {
    if (size.has(tag) && !selected.includes(tag)) onChange([...selected, tag]);
  };
  const remove = (tag: string) => onChange(selected.filter((t) => t !== tag));
  const typed = query.trim().replace(/^#/, "").toLowerCase();
  const suggestions = counts.filter((c) => !selected.includes(c.tag)).slice(0, SUGGESTED_TAGS);
  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
        Tags <span className="font-normal normal-case tracking-normal">· optional</span>
      </legend>
      <p className="mt-1 text-sm text-muted">
        Only questions with at least one of these tags, from the topics above. None chosen: no tag
        filter.
      </p>
      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap items-center gap-2" aria-label="Chosen tags">
          {selected.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove tag ${tag}`}
                className="flex items-center gap-1.5 rounded-lg border border-accent bg-accent-soft px-2.5 py-1 text-sm hover:bg-subtle"
              >
                #{tag}
                <span className="text-muted tabular-nums">{size.get(tag)}</span>
                <span aria-hidden="true" className="text-muted">
                  ×
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-1.5 py-0.5 text-sm font-medium text-accent hover:bg-subtle"
            >
              Clear
            </button>
          </li>
        </ul>
      )}
      <form
        className="mt-2 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (size.has(typed)) {
            add(typed);
            setQuery("");
          }
        }}
      >
        <input
          type="search"
          list="mixed-tag-list"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            // Picking a suggestion fills the box with an exact tag: add it at once.
            const tag = value.trim().replace(/^#/, "").toLowerCase();
            if (size.has(tag) && !selected.includes(tag)) {
              const picked = (e.nativeEvent as InputEvent).inputType;
              if (picked === undefined || picked === "insertReplacementText") {
                add(tag);
                setQuery("");
                return;
              }
            }
            setQuery(value);
          }}
          aria-label="Add a tag"
          placeholder={`Search ${counts.length.toLocaleString("en")} tags`}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!size.has(typed) || selected.includes(typed)}
          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-line-strong hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
        {ready && (
          <datalist id="mixed-tag-list">
            {counts.map((c) => (
              <option key={c.tag} value={c.tag} label={`${c.count}`} />
            ))}
          </datalist>
        )}
      </form>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Most used:</span>
          {suggestions.map((c) => (
            <button
              key={c.tag}
              type="button"
              onClick={() => add(c.tag)}
              className="rounded-md px-1.5 py-0.5 text-accent hover:bg-subtle"
            >
              #{c.tag} <span className="text-muted tabular-nums">{c.count}</span>
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function DomainCheckbox({
  label,
  state,
  onToggle,
}: {
  label: string;
  state: "all" | "some" | "none";
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-4 shrink-0"
      aria-label={`All of ${label}`}
      checked={state === "all"}
      // A click on the checkbox must not also open or close the <details>.
      onClick={(e) => e.stopPropagation()}
      onChange={onToggle}
    />
  );
}
