import { useCallback, useEffect, useRef, useState } from "react";
import {
  answeredCount,
  type ExamAction,
  type ExamState,
  examAnswerOf,
  formatClock,
  remainingMs,
  type TimerLevel,
  timerAnnouncement,
  timerLevel,
} from "../lib/exam";
import { isNumericOnly, parseNumber } from "../lib/grading";
import type { SessionItem } from "../lib/session";
import type { QuizQuestion } from "../lib/types";
import { ConfirmSubmit } from "./ConfirmSubmit";
import { Navigator, QuestionStrip } from "./ExamNavigator";
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

/** Shown on Enter when a numeric-only answer cannot be read. About the format, not the answer. */
const NOT_A_NUMBER = "This does not read as a number.";

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

/** True when some of `el` shows in the window below the sticky status bar. */
function inView(el: Element, barBottom: number): boolean {
  const rect = el.getBoundingClientRect();
  return rect.bottom > barBottom && rect.top < window.innerHeight;
}

/**
 * The test itself: sticky status bar with the countdown, then either one question at a time
 * (Previous / Next) or every question on one page ("all"), the navigator, Submit.
 */
export function ExamRunner({
  exam,
  questions,
  showTopic,
  focusOnMount,
  dispatch,
  onSubmit,
}: ExamRunnerProps) {
  const all = exam.layout === "all";
  const { items, startedAt, durationMs } = exam;
  const total = items.length;
  const answered = answeredCount(exam);
  const unanswered = total - answered;
  const flaggedCount = exam.flagged.length;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.ceil(remainingMs(startedAt, durationMs, Date.now()) / 1000),
  );
  const [timerAlert, setTimerAlert] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [inputError, setInputError] = useState<{ id: string; message: string } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  /** Question elements by id: the card ("one") or each question block ("all"). */
  const blocks = useRef(new Map<string, HTMLElement>());
  /** One at a time: focus the new question after a move. */
  const moved = useRef(focusOnMount);
  /** Latest position, for the scroll tracking of "all". */
  const position = useRef(exam.position);
  /**
   * After jumping to question k the page sits at scroll offset y: k stays the current question
   * until the learner scrolls away from there (a short question would otherwise hand "current"
   * to the next one, whose top is also near the top of the window).
   */
  const pin = useRef<{ k: number; y: number } | null>(null);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
    position.current = exam.position;
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

  /** Scrolls question k just below the status bar if needed, and focuses it. */
  const reveal = useCallback(
    (k: number, focus: boolean) => {
      const id = items[k]?.id;
      const block = id === undefined ? undefined : blocks.current.get(id);
      if (!block) return;
      const bar = barRef.current;
      const top = block.getBoundingClientRect().top;
      const barBottom = bar?.getBoundingClientRect().bottom ?? 0;
      if (all || top < barBottom || top > window.innerHeight * 0.6) {
        window.scrollTo({ top: top + window.scrollY - (bar?.offsetHeight ?? 0) - 12 });
        // Read back: near the end of the page the browser stops short of the target.
        pin.current = { k, y: window.scrollY };
      }
      if (focus) {
        const card = block.tagName === "ARTICLE" ? block : block.querySelector("article");
        card?.focus({ preventScroll: true });
      }
    },
    [all, items],
  );

  const goTo = useCallback(
    (k: number) => {
      if (k < 0 || k >= total) return;
      setInputError(null);
      if (all) {
        reveal(k, true);
        position.current = k;
      } else {
        moved.current = true;
      }
      dispatch({ type: "goto", position: k });
    },
    [all, total, reveal, dispatch],
  );

  // One at a time: show and focus the question after moving to it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the position changes.
  useEffect(() => {
    if (all || !moved.current) return;
    moved.current = false;
    reveal(exam.position, true);
  }, [exam.position]);

  // All on one page: after "Start test" focus the first question; on resume scroll back to the
  // question that was in view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, when the runner appears.
  useEffect(() => {
    if (!all) return;
    if (focusOnMount) reveal(exam.position, true);
    else if (exam.position > 0) reveal(exam.position, false);
  }, []);

  // All on one page: the question in view is the current one (navigator, keys, resume).
  useEffect(() => {
    if (!all) return;
    let frame = 0;
    const questionInView = (): number => {
      const pinned = pin.current;
      if (pinned && Math.abs(window.scrollY - pinned.y) < 24) return pinned.k;
      pin.current = null;
      const barBottom = barRef.current?.getBoundingClientRect().bottom ?? 0;
      // The reading line: a third of the way down the visible area. At the end of the page the
      // last questions may never reach it, so take the last one whose top shows.
      const line = barBottom + (window.innerHeight - barBottom) * 0.3;
      const atEnd =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = 0;
      items.forEach(({ id }, k) => {
        const top = blocks.current.get(id)?.getBoundingClientRect().top;
        if (top !== undefined && (top <= line || (atEnd && top < window.innerHeight))) {
          current = k;
        }
      });
      return current;
    };
    const track = () => {
      frame = 0;
      const current = questionInView();
      if (current !== position.current) {
        position.current = current;
        dispatch({ type: "goto", position: current });
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(track);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [all, items, dispatch]);

  const select = useCallback(
    (id: string, option: number) =>
      dispatch({ type: "select", option, multiple: questions.get(id)?.type === "multiple", id }),
    [dispatch, questions],
  );

  const requestSubmit = useCallback(() => {
    if (unanswered > 0 || flaggedCount > 0) setConfirming(true);
    else onSubmit(false);
  }, [unanswered, flaggedCount, onSubmit]);

  // Keyboard: 1–9 pick the n-th shown option, ←/→ previous / next question, F flags. On one
  // page they act on the focused question if it shows, else on the question in view.
  useEffect(() => {
    const activeIndex = (): number => {
      if (!all) return position.current;
      const focused = document.activeElement?.closest<HTMLElement>("[data-exam-index]");
      const barBottom = barRef.current?.getBoundingClientRect().bottom ?? 0;
      return focused && inView(focused, barBottom)
        ? Number(focused.dataset.examIndex)
        : position.current;
    };
    const onKey = (event: KeyboardEvent) => {
      if (confirming || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (ignoresShortcuts(event.target)) return;
      const k = activeIndex();
      const item = items[k];
      if (!item) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Also stops a focused radio from changing its selection.
        event.preventDefault();
        if (!event.repeat) goTo(event.key === "ArrowLeft" ? k - 1 : k + 1);
        return;
      }
      if (event.repeat) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        dispatch({ type: "toggleFlag", id: item.id });
        return;
      }
      if (/^[1-9]$/.test(event.key) && questions.get(item.id)?.options) {
        const original = item.optionOrder[Number(event.key) - 1];
        if (original === undefined) return;
        event.preventDefault();
        select(item.id, original);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [all, confirming, items, questions, goTo, dispatch, select]);

  /** Enter in a short-answer field: next question, unless the number cannot be read. */
  const submitText = (id: string) => {
    const key = questions.get(id)?.answer;
    const text = examAnswerOf(exam, id).text;
    if (key && isNumericOnly(key) && text.trim() !== "" && parseNumber(text) === null) {
      setInputError({ id, message: NOT_A_NUMBER });
      return;
    }
    const k = items.findIndex((item) => item.id === id);
    if (k < total - 1) goTo(k + 1);
  };

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) blocks.current.set(id, el);
    else blocks.current.delete(id);
  };

  /** "Question k of N", the flag toggle and the card. */
  const renderQuestion = (
    item: SessionItem,
    k: number,
    cardRef?: (el: HTMLElement | null) => void,
  ) => {
    const question = questions.get(item.id);
    if (!question) return null;
    const answer = examAnswerOf(exam, item.id);
    const flagged = exam.flagged.includes(item.id);
    return (
      <>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium tabular-nums">
            Question {k + 1} <span className="text-muted">of {total}</span>
          </p>
          <button
            type="button"
            aria-pressed={flagged}
            onClick={() => dispatch({ type: "toggleFlag", id: item.id })}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              flagged
                ? "border-note/50 bg-note-soft text-note"
                : "border-line text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            <FlagIcon filled={flagged} />
            Flag for review
            {all && <span className="sr-only">: question {k + 1}</span>}
          </button>
        </div>
        <QuestionCard
          ref={cardRef}
          question={question}
          item={item}
          answer={{ ...answer, revealed: false }}
          number={k + 1}
          showTopic={showTopic}
          inputError={inputError?.id === item.id ? inputError.message : null}
          onSelect={(option) => select(item.id, option)}
          onText={(text) => {
            if (inputError?.id === item.id) setInputError(null);
            dispatch({ type: "type", text, id: item.id });
          }}
          onSubmitText={() => submitText(item.id)}
        />
      </>
    );
  };

  const level = timerLevel(secondsLeft * 1000);
  const current = items[exam.position];
  const currentQuestion = current ? questions.get(current.id) : undefined;
  const isLast = exam.position === total - 1;

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
        {all && <QuestionStrip exam={exam} onGo={goTo} />}
      </div>
      <p className="sr-only" aria-live="assertive">
        {timerAlert}
      </p>

      {all ? (
        <>
          <p className="mt-3 hidden text-xs text-muted md:block">
            Keys act on the question in view: 1–9 select · ←/→ previous / next question · F flag
          </p>
          <ol className="mt-4 space-y-10">
            {items.map((item, k) => (
              <li key={item.id} ref={register(item.id)} data-exam-index={k}>
                {renderQuestion(item, k)}
              </li>
            ))}
          </ol>

          <Navigator exam={exam} onGo={goTo} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-xs sm:px-5">
            <p className="text-sm text-muted tabular-nums">
              Answered {answered} of {total}
              {flaggedCount > 0 && ` · ${flaggedCount} flagged`}
            </p>
            <button
              type="button"
              onClick={requestSubmit}
              className="rounded-lg bg-accent px-5 py-2 font-medium text-accent-ink hover:bg-accent-hover"
            >
              Submit test
            </button>
          </div>
        </>
      ) : (
        current &&
        currentQuestion && (
          <>
            <div className="mt-4" key={current.id}>
              {renderQuestion(current, exam.position, register(current.id))}
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:mx-0 sm:border-t-0 sm:px-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo(exam.position - 1)}
                  disabled={exam.position === 0}
                  className="rounded-lg border border-line-strong bg-surface px-4 py-2 font-medium hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true">← </span>Previous
                </button>
                <span className="mx-auto hidden text-center text-xs text-muted md:inline">
                  Keys: {currentQuestion.options ? "1–9 select · " : ""}←/→ move · F flag
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
                    onClick={() => goTo(exam.position + 1)}
                    className="ml-auto rounded-lg bg-accent px-5 py-2 font-medium text-accent-ink hover:bg-accent-hover md:ml-0"
                  >
                    Next<span aria-hidden="true"> →</span>
                  </button>
                )}
              </div>
            </div>

            <Navigator exam={exam} onGo={goTo} />
          </>
        )
      )}

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
