import type { Ref } from "react";
import type { Score } from "../lib/session";
import type { QuizQuestion } from "../lib/types";
import { url } from "../lib/url";
import { Html } from "./Html";

interface SummaryProps {
  score: Score;
  missed: QuizQuestion[];
  onRetryMissed: () => void;
  onRestart: () => void;
  ref?: Ref<HTMLElement>;
}

/** End of a session: score, the questions that were missed with their answers, what next. */
export function Summary({ score, missed, onRetryMissed, onRestart, ref }: SummaryProps) {
  const percent = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="summary-heading"
      className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 shadow-xs outline-none sm:p-6"
    >
      <h2 id="summary-heading" className="text-lg font-semibold">
        Session complete
      </h2>
      <p className="mt-3 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {score.correct}
          <span className="text-muted"> / {score.total}</span>
        </span>
        <span className="text-muted">correct · {percent}%</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {missed.length > 0 && (
          <button
            type="button"
            onClick={onRetryMissed}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
          >
            Retry {missed.length} missed
          </button>
        )}
        <button
          type="button"
          onClick={onRestart}
          className={
            missed.length > 0
              ? "rounded-lg border border-line-strong px-4 py-2 font-medium hover:bg-subtle"
              : "rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
          }
        >
          Practice again
        </button>
        <a
          href={url()}
          className="rounded-lg px-4 py-2 font-medium text-muted hover:bg-subtle hover:text-ink"
        >
          All topics
        </a>
      </div>

      {missed.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Missed questions
          </h3>
          <ol className="mt-3 space-y-3">
            {missed.map((q) => (
              <li key={q.id} className="rounded-xl border border-line px-4 py-3">
                <Html html={q.questionHtml} className="text-sm" />
                <div className="mt-2 border-t border-line pt-2 text-sm">
                  <span className="font-medium text-good">Answer: </span>
                  <CorrectAnswer question={q} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function CorrectAnswer({ question: q }: { question: QuizQuestion }) {
  if (q.answer) return <Html html={q.answer.modelHtml} className="mt-1" />;
  const correct = (q.options ?? []).filter((o) => o.correct);
  if (correct.length === 1 && correct[0]) return <Html html={correct[0].html} inline />;
  return (
    <ul className="mt-1 list-disc pl-5">
      {correct.map((o) => (
        <li key={o.html}>
          <Html html={o.html} inline />
        </li>
      ))}
    </ul>
  );
}
