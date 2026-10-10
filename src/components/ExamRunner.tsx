import { useCallback, useEffect, useRef, useState } from "react";
import {
  answeredCount,
  currentExamItem,
  type ExamAction,
  type ExamState,
  examAnswerOf,
  formatClock,
  isAnswered,
  remainingMs,
  type TimerLevel,
  timerAnnouncement,
  timerLevel,
} from "../lib/exam";
import { parseNumber } from "../lib/grading";
import type { QuizQuestion } from "../lib/types";
import { ClockIcon, FlagIcon } from "./Icons";
import { QuestionCard } from "./QuestionCard";

interface ExamRunnerProps {
  exam: ExamState;
  questions: ReadonlyMap<string, QuizQuestion>;
  showTopic: boolean;
  /** Focus the first question when the runner appears (after "Start test", not on resume). */
  focusOnMount: boolean;
  dispatch: (action: ExamAction) => void;
  /** Ends the test; `timedOut` when the clock reached 00:00. */
  onSubmit: (timedOut: boolean) => void;
}

const TIMER_TONE: Record<TimerLevel, string> = {
  normal: "bg-subtle text-ink",
  warning: "bg-note-soft text-note",
  critical: "bg-bad-soft text-bad",
};

const NUMBER_HINT = "Enter a number, e.g. 42, -0.5, 1/3 or 2.5e-3 — anything else is marked wrong.";

/** Keys go to the page unless the learner is typing (or scrolling wide code / math). */
function ignoresShortcuts(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("textarea, select, [contenteditable], dialog, pre, .katex-display")) {
    return true;
  }
  return (
    target instanceof HTMLInputElement && target.type !== "radio" && target.type !== "checkbox"
  );
}

/** The test itself: status bar with the countdown, one question at a time, navigator. */
export function ExamRunner({
  exam,
  questions,
  showTopic,
  focusOnMount,
  dispatch,
  onSubmit,
}: ExamRunnerProps) {
  const item = currentExamItem(exam);
  const question = item ? questions.get(item.id) : undefined;
  const answer = item ? examAnswerOf(exam, item.id) : undefined;
  const total = exam.items.length;
  const answered = answeredCount(exam);
  const unanswered = total - answered;
  const flaggedCount = exam.flagged.length;
  const isFlagged = item ? exam.flagged.includes(item.id) : false;
  const isFirst = exam.position === 0;
  const isLast = exam.position === total - 1;

  const { startedAt, durationMs } = exam;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.ceil(remainingMs(startedAt, durationMs, Date.now()) / 1000),
  );
  const [timerAlert, setTimerAlert] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const moved = useRef(focusOnMount);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  });

  // The clock is derived from the start timestamp, so it is right after the tab slept; ticks
  // only refresh the display. At 00:00 the test submits itself.
  useEffect(() => {
    let previous = remainingMs(startedAt, durationMs, Date.now());
    const tick = () => {
      const left = remainingMs(startedAt, durationMs, Date.now());
      const message = timerAnnouncement(previous, left);
      previous = left;
      if (message) setTimerAlert(message);
      setSecondsLeft(Math.ceil(left / 1000));
      if (left <= 0) submitRef.current(true);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startedAt, durationMs]);

  // Focus the question after moving to it, keeping it clear of the sticky status bar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the position changes.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const card = cardRef.current;
    if (!card) return;
    card.focus({ preventScroll: true });
    const barBottom = barRef.current?.getBoundingClientRect().bottom ?? 0;
    const top = card.getBoundingClientRect().top;
    if (top < barBottom || top > window.innerHeight * 0.6) {
      window.scrollBy({ top: top - barBottom - 12 });
    }
  }, [exam.position]);

  const go = useCallback(
    (action: ExamAction) => {
      moved.current = true;
      setHint(null);
      dispatch(action);
    },
    [dispatch],
  );

  const select = useCallback(
    (option: number) =>
      dispatch({ type: "select", option, multiple: question?.type === "multiple" }),
    [dispatch, question],
  );

  const requestSubmit = useCallback(() => {
    if (unanswered > 0 || flaggedCount > 0) setConfirming(true);
    else onSubmit(false);
  }, [unanswered, flaggedCount, onSubmit]);

  // Keyboard: 1–9 pick the n-th shown option, ←/→ move, F flags.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (confirming || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (ignoresShortcuts(event.target)) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Also stops a focused radio from changing its selection.
        event.preventDefault();
        if (!event.repeat) go({ type: event.key === "ArrowLeft" ? "previous" : "next" });
        return;
      }
      if (event.repeat) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        dispatch({ type: "toggleFlag" });
        return;
      }
      if (/^[1-9]$/.test(event.key) && item && question?.options) {
        const original = item.optionOrder[Number(event.key) - 1];
        if (original === undefined) return;
        event.preventDefault();
        select(original);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, go, dispatch, select, item, question]);

  /** Enter in a short-answer field: next question, unless the number cannot be read. */
  const submitText = () => {
    const key = question?.answer;
    const numericOnly = key && typeof key.numeric === "number" && key.accept.length === 0;
    if (numericOnly && answer && answer.text.trim() !== "" && parseNumber(answer.text) === null) {
      setHint(NUMBER_HINT);
      return;
    }
    if (!isLast) go({ type: "next" });
  };

  const level = timerLevel(secondsLeft * 1000);

  return (
    <div>
      <div
        ref={barRef}
        className="sticky top-0 z-20 -mx-4 border-b border-line bg-canvas/90 px-4 pt-2.5 pb-2 backdrop-blur sm:mx-0 sm:px-0"
      >
        <div className="flex items-center gap-3">
          <span
            role="timer"
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold tabular-nums transition-colors ${TIMER_TONE[level]}`}
          >
            <ClockIcon />
            <span className="sr-only">Time left: </span>
            {formatClock(secondsLeft * 1000)}
          </span>
          <span className="text-sm text-muted tabular-nums">
            <span className="hidden min-[360px]:inline">Answered </span>
            {answered} / {total}
            <span className="sr-only"> answered</span>
          </span>
          <button
            type="button"
            onClick={requestSubmit}
            className="ml-auto rounded-lg border border-line-strong bg-surface px-3.5 py-1.5 text-sm font-medium hover:bg-subtle"
          >
            Submit
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${total ? (answered / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <p className="sr-only" aria-live="assertive">
        {timerAlert}
      </p>

      {item && question && answer && (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium tabular-nums">
              Question {exam.position + 1} <span className="text-muted">of {total}</span>
            </p>
            <button
              type="button"
              aria-pressed={isFlagged}
              onClick={() => dispatch({ type: "toggleFlag" })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isFlagged
                  ? "border-note/50 bg-note-soft text-note"
                  : "border-line text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              <FlagIcon filled={isFlagged} />
              Flag for review
            </button>
          </div>

          <QuestionCard
            key={item.id}
            ref={cardRef}
            question={question}
            item={item}
            answer={{ ...answer, revealed: false }}
            number={exam.position + 1}
            showTopic={showTopic}
            hint={hint}
            onSelect={select}
            onText={(text) => {
              setHint(null);
              dispatch({ type: "type", text });
            }}
            onSubmitText={submitText}
          />

          <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:mx-0 sm:border-t-0 sm:px-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go({ type: "previous" })}
                disabled={isFirst}
                className="rounded-lg border border-line-strong bg-surface px-4 py-2 font-medium hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden="true">← </span>Previous
              </button>
              <span className="mx-auto hidden text-center text-xs text-muted md:inline">
                Keys: {question.options ? "1–9 select · " : ""}←/→ move · F flag
              </span>
              {isLast ? (
                <button
                  type="button"
                  onClick={requestSubmit}
                  className="ml-auto rounded-lg bg-accent px-5 py-2 font-medium text-accent-ink hover:bg-accent-hover md:ml-0"
                >
                  Submit test
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go({ type: "next" })}
                  className="ml-auto rounded-lg bg-accent px-5 py-2 font-medium text-accent-ink hover:bg-accent-hover md:ml-0"
                >
                  Next<span aria-hidden="true"> →</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <Navigator exam={exam} onGo={(position) => go({ type: "goto", position })} />

      <ConfirmSubmit
        open={confirming}
        unanswered={unanswered}
        flagged={flaggedCount}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onSubmit(false);
        }}
      />
    </div>
  );
}

/** Grid of question numbers: answered / unanswered / flagged, click to jump. */
function Navigator({ exam, onGo }: { exam: ExamState; onGo: (position: number) => void }) {
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
          const flagged = exam.flagged.includes(id);
          const current = k === exam.position;
          const state = [done ? "answered" : "not answered", flagged ? "flagged" : ""]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onGo(k)}
                aria-current={current ? "step" : undefined}
                aria-label={`Question ${k + 1}, ${state}`}
                className={`relative flex h-10 w-full items-center justify-center rounded-lg border text-sm tabular-nums transition-colors ${
                  done
                    ? "border-accent/60 bg-accent-soft font-semibold text-ink"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
                } ${current ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
              >
                {k + 1}
                {flagged && (
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
          Current
        </li>
      </ul>
    </nav>
  );
}

function ConfirmSubmit({
  open,
  unanswered,
  flagged,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  unanswered: number;
  flagged: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const parts = [];
  if (unanswered > 0) {
    parts.push(`${unanswered} ${unanswered === 1 ? "question is" : "questions are"} unanswered`);
  }
  if (flagged > 0) {
    parts.push(`${flagged} ${flagged === 1 ? "is" : "are"} flagged for review`);
  }
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="exam-confirm-title"
      aria-describedby="exam-confirm-text"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-black/50 sm:p-6"
    >
      <h2 id="exam-confirm-title" className="text-lg font-semibold">
        Submit the test?
      </h2>
      <p id="exam-confirm-text" className="mt-2 text-muted">
        {parts.length > 0 && `${capitalize(parts.join(" and "))}. `}
        {unanswered > 0 ? "Unanswered questions count as wrong. " : ""}
        Answers cannot be changed after submitting.
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          // biome-ignore lint/a11y/noAutofocus: the safe choice gets focus when the dialog opens.
          autoFocus
          onClick={onCancel}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 font-medium hover:bg-subtle"
        >
          Keep working
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
        >
          Submit test
        </button>
      </div>
    </dialog>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
