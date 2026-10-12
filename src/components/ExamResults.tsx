import { type Ref, useEffect, useState } from "react";
import {
  describeAttempt,
  type ExamHistory,
  type ExamOutcome,
  type ExamScore,
  type ExamState,
  examAnswerOf,
  formatClock,
} from "../lib/exam";
import { msg } from "../lib/i18n";
import type { ExamScopeView, QuizQuestion } from "../lib/types";
import { url } from "../lib/url";
import { useT } from "../lib/use-lang";
import { CheckIcon, CrossIcon, FlagIcon, MinusIcon } from "./Icons";
import { QuestionCard } from "./QuestionCard";

/** A submitted test, as shown on the results screen. */
export interface FinishedExam {
  state: ExamState;
  score: ExamScore;
  /** When the test ended, in epoch milliseconds. */
  finishedAt: number;
  /** Time used in milliseconds. */
  usedMs: number;
  /** Submitted automatically when the clock reached 00:00. */
  timedOut: boolean;
  /** Better than every earlier test of this topic or tag. */
  newBest: boolean;
}

interface ExamResultsProps {
  result: FinishedExam;
  questions: ReadonlyMap<string, QuizQuestion>;
  scope: ExamScopeView;
  history: ExamHistory;
  showTopic: boolean;
  onNewTest: () => void;
  ref?: Ref<HTMLElement>;
}

const OUTCOME: Record<ExamOutcome, { label: string; tone: string; Icon: typeof CheckIcon }> = {
  correct: {
    label: msg("Correct"),
    tone: "border-good/40 bg-good-soft text-good",
    Icon: CheckIcon,
  },
  incorrect: {
    label: msg("Incorrect"),
    tone: "border-bad/40 bg-bad-soft text-bad",
    Icon: CrossIcon,
  },
  unanswered: {
    label: msg("Not answered"),
    tone: "border-dashed border-line-strong bg-canvas text-muted",
    Icon: MinusIcon,
  },
};

const noop = () => {};

/** Score, time used, and every question with the learner's answer, the key and the explanation. */
export function ExamResults({
  result,
  questions,
  scope,
  history,
  showTopic,
  onNewTest,
  ref,
}: ExamResultsProps) {
  const t = useT();
  const { state, score, finishedAt, usedMs, timedOut, newBest } = result;
  // The best score so far, unless it is this very test.
  const otherBest = history.best && history.best.at !== finishedAt ? history.best : undefined;
  const [onlyIncorrect, setOnlyIncorrect] = useState(false);
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const wrongCount = score.incorrect + score.unanswered;
  const rows = state.items.map((item, k) => ({ item, k, outcome: score.outcomes[item.id] }));
  const visible = onlyIncorrect ? rows.filter((r) => r.outcome !== "correct") : rows;

  // Jump to a question from the grid (showing it first if the filter hides it).
  useEffect(() => {
    if (!jumpTo) return;
    const el = document.getElementById(`review-${jumpTo}`);
    setJumpTo(null);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.querySelector<HTMLElement>("article")?.focus({ preventScroll: true });
  }, [jumpTo]);

  const jump = (id: string) => {
    if (onlyIncorrect && score.outcomes[id] === "correct") setOnlyIncorrect(false);
    setJumpTo(id);
  };

  return (
    <div>
      <section
        ref={ref}
        tabIndex={-1}
        aria-labelledby="exam-results-heading"
        className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 shadow-xs outline-none sm:p-6"
      >
        <h2 id="exam-results-heading" className="text-lg font-semibold">
          {timedOut ? t("Time’s up — your test was submitted") : t("Test submitted")}
        </h2>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">
            {score.correct}
            <span className="text-muted"> / {score.total}</span>
          </span>
          <span className="text-muted">
            {t("correct · {percent}%", { percent: score.percent })}
          </span>
          {newBest && (
            <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-sm font-medium text-good">
              {t("New best")}
            </span>
          )}
        </p>
        <p className="mt-2 text-sm text-muted tabular-nums">
          {t("Time used {used} of {total}", {
            used: formatClock(usedMs, "floor"),
            total: formatClock(state.durationMs),
          })}
          {score.unanswered > 0 && t(" · {n} not answered", { n: score.unanswered })}
          {state.reviewedOnly && t(" · reviewed questions only")}
          {otherBest && t(" · best {score}", { score: describeAttempt(otherBest) })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNewTest}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
          >
            {t("New test")}
          </button>
          <a
            href={scope.practiceUrl}
            className="rounded-lg border border-line-strong px-4 py-2 font-medium hover:bg-subtle"
          >
            {scope.practiceLabel
              ? t(scope.practiceLabel)
              : scope.kind === "tag"
                ? t("Practice this tag")
                : t("Practice this topic")}
          </a>
          <a
            href={url()}
            className="rounded-lg px-4 py-2 font-medium text-muted hover:bg-subtle hover:text-ink"
          >
            {t("All topics")}
          </a>
        </div>

        <nav aria-label={t("Jump to a question")} className="mt-6">
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
            {rows.map(({ item, k, outcome = "unanswered" }) => {
              const { label, tone, Icon } = OUTCOME[outcome];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jump(item.id)}
                    aria-label={t("Question {n}: {outcome}", {
                      n: k + 1,
                      outcome: t(label).toLocaleLowerCase(t.lang),
                    })}
                    className={`flex h-10 w-full items-center justify-center gap-0.5 rounded-lg border text-sm font-medium tabular-nums transition-opacity hover:opacity-80 ${tone}`}
                  >
                    {k + 1}
                    <Icon className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </section>

      <section aria-labelledby="exam-review-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="exam-review-heading" className="text-lg font-semibold">
            {t("Review your answers")}
          </h2>
          {wrongCount > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                className="size-4"
                checked={onlyIncorrect}
                onChange={(e) => setOnlyIncorrect(e.target.checked)}
              />
              {t("Show only incorrect ({n})", { n: wrongCount })}
            </label>
          )}
        </div>
        {wrongCount === 0 && (
          <p className="mt-2 text-sm text-muted">{t("Every answer is correct — well done.")}</p>
        )}

        <ol className="mt-4 space-y-8">
          {visible.map(({ item, k, outcome = "unanswered" }) => {
            const question = questions.get(item.id);
            if (!question) return null;
            const answer = examAnswerOf(state, item.id);
            const { label, tone, Icon } = OUTCOME[outcome];
            return (
              <li key={item.id} id={`review-${item.id}`} className="scroll-mt-4">
                <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium tabular-nums">
                    {t("Question {n}", { n: k + 1 })}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
                  >
                    <Icon className="size-3.5" />
                    {t(label)}
                  </span>
                  {state.flagged.includes(item.id) && (
                    <span className="inline-flex items-center gap-1 text-xs text-note">
                      <FlagIcon filled className="size-3.5" />
                      {t("Flagged")}
                    </span>
                  )}
                </p>
                <QuestionCard
                  question={question}
                  item={item}
                  answer={{
                    ...answer,
                    blanks: answer.blanks ?? [],
                    outcome: outcome === "correct" ? "correct" : "incorrect",
                  }}
                  number={k + 1}
                  showTopic={showTopic}
                  inputError={null}
                  onSelect={noop}
                  onText={noop}
                  onSubmitText={noop}
                />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
