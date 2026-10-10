import type { Ref } from "react";
import {
  describeAttempt,
  type ExamAttempt,
  type ExamHistory,
  type ExamPlan,
  formatAttemptDate,
  lastAttempt,
} from "../lib/exam";
import type { ExamScopeView } from "../lib/types";
import { ClockIcon } from "./Icons";

interface ExamStartProps {
  scope: ExamScopeView;
  /** Size and time limit for the current "reviewed only" choice. */
  plan: ExamPlan;
  reviewedOnly: boolean;
  /** Eligible reviewed / draft questions. */
  reviewedCount: number;
  draftCount: number;
  /** Open short answers left out of tests. */
  excluded: number;
  history: ExamHistory;
  onReviewedOnly: (value: boolean) => void;
  onStart: () => void;
  ref?: Ref<HTMLElement>;
}

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

/** Before the clock starts: size, time limit, rules, last and best score. */
export function ExamStart({
  scope,
  plan,
  reviewedOnly,
  reviewedCount,
  draftCount,
  excluded,
  history,
  onReviewedOnly,
  onStart,
  ref,
}: ExamStartProps) {
  const n = plan.count;
  const size = `${plural(n, "question")} · ${plural(n, "minute")}`;
  const last = lastAttempt(history);
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
        Random questions from {scope.kind === "tag" ? "the tag " : ""}
        <span className="text-ink">{scope.title}</span>, a new set every time.
      </p>

      {plan.short && n > 0 && (
        <p className="mt-4 rounded-xl bg-subtle px-3.5 py-2.5 text-sm">
          {`This ${scope.kind} has ${plural(plan.available, reviewedOnly ? "reviewed question" : "question")}, so this test has ${size}.`}
        </p>
      )}
      {n === 0 && (
        <p className="mt-4 rounded-xl bg-note-soft px-3.5 py-2.5 text-sm text-note">
          No questions to draw from{reviewedOnly ? " with “Reviewed questions only”" : ""}.
        </p>
      )}

      <h3 className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">Rules</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted">
        <li>One minute per question. Move freely between questions and flag any to revisit.</li>
        <li>
          No feedback until you submit — then you get your score and every answer explained.
          Unanswered questions count as wrong.
        </li>
        <li>
          The timer keeps running if you leave or reload the page, and the test is submitted
          automatically when it reaches 00:00.
        </li>
      </ul>
      {excluded > 0 && (
        <p className="mt-3 text-sm text-muted">
          {plural(excluded, "open short-answer question")} {excluded === 1 ? "is" : "are"} left out:{" "}
          {excluded === 1 ? "it needs" : "they need"} self-grading, so{" "}
          {excluded === 1 ? "it stays" : "they stay"} in practice mode.
        </p>
      )}

      {draftCount > 0 && (
        <label
          className={`mt-5 inline-flex items-center gap-2 text-sm ${reviewedCount === 0 ? "text-muted opacity-60" : "cursor-pointer"}`}
          title={reviewedCount === 0 ? "No reviewed questions here yet" : undefined}
        >
          <input
            type="checkbox"
            className="size-4"
            checked={reviewedOnly}
            disabled={reviewedCount === 0}
            onChange={(e) => onReviewedOnly(e.target.checked)}
          />
          Reviewed questions only ({reviewedCount})
        </label>
      )}

      {last && (
        <dl className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
          <AttemptTile label="Last test" attempt={last} />
          {history.best && <AttemptTile label="Best" attempt={history.best} />}
        </dl>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={onStart}
          disabled={n === 0}
          className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start test
        </button>
        <a
          href={scope.practiceUrl}
          className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Practice with instant feedback instead
        </a>
      </div>
    </section>
  );
}

function AttemptTile({ label, attempt }: { label: string; attempt: ExamAttempt }) {
  return (
    <div className="min-w-0 rounded-xl border border-line px-3 py-2.5 sm:px-3.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{describeAttempt(attempt)}</dd>
      <dd className="mt-0.5 text-xs text-muted">{formatAttemptDate(attempt.at)}</dd>
    </div>
  );
}
