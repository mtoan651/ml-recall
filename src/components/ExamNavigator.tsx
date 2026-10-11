import { useEffect, useRef } from "react";
import { answeredCount, type ExamState, isAnswered } from "../lib/exam";
import { FlagIcon } from "./Icons";

interface NavigatorProps {
  exam: ExamState;
  /** Go to (or scroll to) the question at this index. */
  onGo: (position: number) => void;
}

/** What a navigator button says to screen readers: "Question 3, answered, flagged". */
function describe(exam: ExamState, id: string, k: number): string {
  const state = [isAnswered(exam.answers[id]) ? "answered" : "not answered"];
  if (exam.flagged.includes(id)) state.push("flagged");
  return `Question ${k + 1}, ${state.join(", ")}`;
}

/** Grid of question numbers: answered / unanswered / flagged / current, click to jump. */
export function Navigator({ exam, onGo }: NavigatorProps) {
  const answered = answeredCount(exam);
  return (
    <nav
      aria-label="Questions"
      className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-xs sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Questions</h2>
        <p className="text-xs text-muted tabular-nums">
          {answered} answered · {exam.items.length - answered} unanswered · {exam.flagged.length}{" "}
          flagged
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
        {exam.items.map(({ id }, k) => {
          const done = isAnswered(exam.answers[id]);
          const current = k === exam.position;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onGo(k)}
                aria-current={current ? "step" : undefined}
                aria-label={describe(exam, id, k)}
                className={`relative flex h-10 w-full items-center justify-center rounded-lg border text-sm tabular-nums transition-colors ${
                  done
                    ? "border-accent/60 bg-accent-soft font-semibold text-ink"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
                } ${current ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
              >
                {k + 1}
                {exam.flagged.includes(id) && (
                  <FlagIcon filled className="absolute top-0.5 right-0.5 size-3.5 text-note" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="Legend">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border border-accent/60 bg-accent-soft" />
          Answered
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border border-line bg-canvas" />
          Unanswered
        </li>
        <li className="inline-flex items-center gap-1.5">
          <FlagIcon filled className="size-3.5 text-note" />
          Flagged
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded ring-2 ring-accent ring-offset-1 ring-offset-surface" />
          {exam.layout === "all" ? "In view" : "Current"}
        </li>
      </ul>
    </nav>
  );
}

/**
 * One row of question numbers for the sticky status bar when all questions are on one page:
 * always within reach while scrolling. Scrolls sideways on narrow screens and keeps the
 * question in view visible.
 */
export function QuestionStrip({ exam, onGo }: NavigatorProps) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.children[exam.position] as HTMLElement | undefined;
    if (!list || !chip) return;
    const margin = 8;
    if (chip.offsetLeft - margin < list.scrollLeft) {
      list.scrollLeft = chip.offsetLeft - margin;
    } else if (chip.offsetLeft + chip.offsetWidth + margin > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = chip.offsetLeft + chip.offsetWidth + margin - list.clientWidth;
    }
  }, [exam.position]);

  return (
    <nav aria-label="Jump to question" className="mt-2">
      <ol ref={listRef} className="relative flex gap-1 overflow-x-auto pt-1 pr-1 pb-0.5">
        {exam.items.map(({ id }, k) => {
          const done = isAnswered(exam.answers[id]);
          const current = k === exam.position;
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => onGo(k)}
                aria-current={current ? "location" : undefined}
                aria-label={describe(exam, id, k)}
                className={`relative flex h-8 min-w-8 items-center justify-center rounded-md border px-1 text-xs tabular-nums transition-colors ${
                  done
                    ? "border-accent/60 bg-accent-soft font-semibold text-ink"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
                } ${current ? "border-accent ring-1 ring-accent" : ""}`}
              >
                {k + 1}
                {exam.flagged.includes(id) && (
                  <FlagIcon filled className="absolute -top-1 -right-1 size-3 text-note" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
