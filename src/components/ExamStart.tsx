import type { Ref } from "react";
import { COURSE_WEIGHTS, type CourseWeight } from "../lib/course";
import {
  describeAttempt,
  type ExamAttempt,
  type ExamHistory,
  type ExamLayout,
  type ExamPlan,
  formatAttemptDate,
  lastAttempt,
} from "../lib/exam";
import { msg, scopeName } from "../lib/i18n";
import type { ExamScopeView } from "../lib/types";
import { useT } from "../lib/use-lang";
import { ClockIcon } from "./Icons";

interface ExamStartProps {
  scope: ExamScopeView;
  /** Size and time limit for the current "reviewed only" choice. */
  plan: ExamPlan;
  reviewedOnly: boolean;
  /** Reviewed / draft questions of the topic or tag. */
  reviewedCount: number;
  draftCount: number;
  layout: ExamLayout;
  /** Course questions in the pool when the pool also has others (0: no boost choice). */
  courseCount: number;
  courseWeight: CourseWeight;
  onCourseWeight: (value: CourseWeight) => void;
  history: ExamHistory;
  onReviewedOnly: (value: boolean) => void;
  onLayout: (value: ExamLayout) => void;
  onStart: () => void;
  ref?: Ref<HTMLElement>;
}

const LAYOUTS: Array<{ value: ExamLayout; title: string; description: string }> = [
  {
    value: "one",
    title: msg("One at a time"),
    description: msg("One question per screen, with Previous / Next."),
  },
  {
    value: "all",
    title: msg("All on one page"),
    description: msg("Every question on one page, like a paper exam. Submit at the bottom."),
  },
];

/** "This topic has 8 questions, so this test has …", by what the test is about. */
const SHORT_POOL = {
  topic: msg("This topic has {count}, so this test has {size}."),
  tag: msg("This tag has {count}, so this test has {size}."),
  mixed: msg("This selection has {count}, so this test has {size}."),
} as const;

/** Before the clock starts: size, time limit, rules, layout, last and best score. */
export function ExamStart({
  scope,
  plan,
  reviewedOnly,
  reviewedCount,
  draftCount,
  layout,
  courseCount,
  courseWeight,
  onCourseWeight,
  history,
  onReviewedOnly,
  onLayout,
  onStart,
  ref,
}: ExamStartProps) {
  const t = useT();
  const n = plan.count;
  const size = t.n(n, "{n} question · {n} minute", "{n} questions · {n} minutes");
  const last = lastAttempt(history);
  const available = reviewedOnly
    ? t.n(plan.available, "{n} reviewed question", "{n} reviewed questions")
    : t.n(plan.available, "{n} question", "{n} questions");
  const name = <span className="text-ink">{scopeName(t.lang, scope)}</span>;
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="exam-start-heading"
      className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 shadow-xs outline-none sm:p-6"
    >
      <h2
        id="exam-start-heading"
        className="flex items-center gap-2.5 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl"
      >
        <ClockIcon className="size-6 shrink-0 text-accent" />
        {size}
      </h2>
      <p className="mt-2 text-muted">
        {scope.kind === "tag"
          ? t.rich("Random questions from the tag {title}, a new set every time.", { title: name })
          : t.rich("Random questions from {title}, a new set every time.", { title: name })}
      </p>

      {plan.short && n > 0 && (
        <p className="mt-4 rounded-xl bg-subtle px-3.5 py-2.5 text-sm">
          {t(SHORT_POOL[scope.kind], { count: available, size })}
        </p>
      )}
      {n === 0 && (
        <p className="mt-4 rounded-xl bg-note-soft px-3.5 py-2.5 text-sm text-note">
          {reviewedOnly
            ? t("No questions to draw from with “Reviewed questions only”.")
            : t("No questions to draw from.")}
        </p>
      )}

      <h3 className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">
        {t("Rules")}
      </h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted">
        <li>
          {t("One minute per question. Move freely between questions and flag any to revisit.")}
        </li>
        <li>
          {t(
            "No feedback until you submit — then you get your score and every answer explained. Unanswered questions count as wrong.",
          )}
        </li>
        <li>
          {t(
            "The timer keeps running if you leave or reload the page, and the test is submitted automatically when it reaches 00:00.",
          )}
        </li>
      </ul>

      <LayoutPicker layout={layout} onLayout={onLayout} className="mt-5" />

      {courseCount > 0 && (
        <CoursePicker
          count={courseCount}
          weight={courseWeight}
          onChange={onCourseWeight}
          className="mt-5"
        />
      )}

      {draftCount > 0 && (
        <label
          className={`mt-5 inline-flex items-center gap-2 text-sm ${reviewedCount === 0 ? "text-muted opacity-60" : "cursor-pointer"}`}
          title={reviewedCount === 0 ? t("No reviewed questions here yet") : undefined}
        >
          <input
            type="checkbox"
            className="size-4"
            checked={reviewedOnly}
            disabled={reviewedCount === 0}
            onChange={(e) => onReviewedOnly(e.target.checked)}
          />
          {t("Reviewed questions only ({n})", { n: reviewedCount })}
        </label>
      )}

      {last && (
        <dl className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
          <AttemptTile label={msg("Last test")} attempt={last} />
          {history.best && <AttemptTile label={msg("Best")} attempt={history.best} />}
        </dl>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={onStart}
          disabled={n === 0}
          className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Start test")}
        </button>
        <a
          href={scope.practiceUrl}
          className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {t("Practice with instant feedback instead")}
        </a>
      </div>
    </section>
  );
}

const COURSE_CHOICES: Record<CourseWeight, string> = {
  1: msg("As often as others"),
  4: msg("More (4×)"),
  16: msg("Mostly (16×)"),
};

/**
 * How often a test draws the CE6146 course questions of its pool (remembered in the settings;
 * src/lib/course.ts).
 */
export function CoursePicker({
  count,
  weight,
  onChange,
  className = "",
}: {
  /** Course questions in the pool. */
  count: number;
  weight: CourseWeight;
  onChange: (value: CourseWeight) => void;
  className?: string;
}) {
  const t = useT();
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
        {t("CE6146 course questions ({n} here)", { n: count })}
      </legend>
      <p className="mt-1 text-sm text-muted">
        {t("Written from the course's lecture slides and in-class exercises.")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {COURSE_WEIGHTS.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              weight === value
                ? "border-accent bg-accent-soft"
                : "border-line hover:border-line-strong hover:bg-subtle"
            }`}
          >
            <input
              type="radio"
              name="course-weight"
              value={value}
              checked={weight === value}
              onChange={() => onChange(value)}
              className="size-4 shrink-0"
            />
            <span>{t(COURSE_CHOICES[value])}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** One question at a time, or all on one page (remembered in the settings). */
export function LayoutPicker({
  layout,
  onLayout,
  className = "",
}: {
  layout: ExamLayout;
  onLayout: (value: ExamLayout) => void;
  className?: string;
}) {
  const t = useT();
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
        {t("Layout")}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {LAYOUTS.map(({ value, title, description }) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
              layout === value
                ? "border-accent bg-accent-soft"
                : "border-line hover:border-line-strong hover:bg-subtle"
            }`}
          >
            <input
              type="radio"
              name="exam-layout"
              value={value}
              checked={layout === value}
              onChange={() => onLayout(value)}
              className="mt-1 size-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="block font-medium">{t(title)}</span>
              <span className="block text-sm text-muted">{t(description)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Last or best test: `label` is a translation key. */
export function AttemptTile({ label, attempt }: { label: string; attempt: ExamAttempt }) {
  const t = useT();
  return (
    <div className="min-w-0 rounded-xl border border-line px-3 py-2.5 sm:px-3.5">
      <dt className="text-xs text-muted">{t(label)}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{describeAttempt(attempt)}</dd>
      <dd className="mt-0.5 text-xs text-muted">{formatAttemptDate(attempt.at, t.lang)}</dd>
    </div>
  );
}
