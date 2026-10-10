import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createExam,
  EMPTY_HISTORY,
  type ExamAction,
  type ExamAttempt,
  type ExamHistory,
  type ExamState,
  examPool,
  examReducer,
  examScope,
  isBetterAttempt,
  isExpired,
  planExam,
  type StoredQuestionInfo,
  scoreExam,
  timeUsedMs,
} from "../lib/exam";
import type { SessionInput } from "../lib/session";
import {
  clearExam,
  loadExam,
  loadExamHistory,
  loadSettings,
  saveExam,
  saveExamAttempt,
  saveResults,
  saveSettings,
} from "../lib/storage";
import type { ExamScopeView, QuizQuestion } from "../lib/types";
import { ExamResults, type FinishedExam } from "./ExamResults";
import { ExamRunner } from "./ExamRunner";
import { ExamStart } from "./ExamStart";

interface ExamProps {
  /** Questions of the topic or tag that can be in a test (see `isExamEligible`). */
  questions: QuizQuestion[];
  scope: ExamScopeView;
  /** Open short answers of the topic or tag, left out because they cannot be auto-graded. */
  excluded?: number;
  /** Show each question's topic (cross-topic sets such as tag pages). */
  showTopic?: boolean;
}

const toInput = (q: QuizQuestion): SessionInput => ({
  id: q.id,
  shuffleOptions: q.shuffleOptions,
  optionCount: q.options?.length ?? 0,
});

/**
 * A timed test over the questions of one topic or tag: start screen → one question at a time
 * against the clock, no feedback → results with every answer explained. The test in progress
 * is saved in localStorage after every change, so a reload resumes it.
 */
export default function Exam({ questions, scope, excluded = 0, showTopic = false }: ExamProps) {
  const scopeKey = examScope(scope.kind, scope.id);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const storedInfo = useMemo(
    () =>
      new Map<string, StoredQuestionInfo>(
        questions.map((q) => [q.id, { type: q.type, optionCount: q.options?.length ?? 0 }]),
      ),
    [questions],
  );
  const eligibleCount = useMemo(() => examPool(questions, false).length, [questions]);
  const reviewedCount = useMemo(() => examPool(questions, true).length, [questions]);

  // The server renders the start screen; the browser then restores settings, history and a
  // test in progress before showing anything (see `.quiz[data-ready]` in global.css).
  const [ready, setReady] = useState(false);
  const [reviewedOnlySetting, setReviewedOnlySetting] = useState(false);
  const reviewedOnly = reviewedOnlySetting && reviewedCount > 0;
  const [history, setHistory] = useState<ExamHistory>(EMPTY_HISTORY);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [finished, setFinished] = useState<FinishedExam | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [startedHere, setStartedHere] = useState(false);
  /** `startedAt` of the last finished test: the timer and a click must not submit twice. */
  const finishedAt = useRef<number | null>(null);
  const viewRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  /** Move focus to the new view (start screen or results) after a user action. */
  const moved = useRef(false);

  const plan = planExam(reviewedOnly ? reviewedCount : eligibleCount);

  const dispatch = useCallback(
    (action: ExamAction) => setExam((state) => (state ? examReducer(state, action) : state)),
    [],
  );

  const finish = useCallback(
    (state: ExamState, timedOut: boolean) => {
      if (finishedAt.current === state.startedAt) return;
      finishedAt.current = state.startedAt;
      const end = Math.min(Date.now(), state.startedAt + state.durationMs);
      const score = scoreExam(state, byId);
      const usedMs = timeUsedMs(state.startedAt, state.durationMs, end);
      const attempt: ExamAttempt = {
        correct: score.correct,
        total: score.total,
        at: end,
        durationMs: usedMs,
        reviewedOnly: state.reviewedOnly,
        timedOut,
      };
      const previousBest = loadExamHistory(scopeKey).best;
      setHistory(saveExamAttempt(scopeKey, attempt));
      // Answered questions also count as practice progress (the "answered" bars on the index).
      saveResults(
        state.items.flatMap(({ id }) => {
          const outcome = score.outcomes[id];
          return outcome === "correct" || outcome === "incorrect"
            ? [[id, outcome === "correct"] as const]
            : [];
        }),
        undefined,
        end,
      );
      clearExam(scopeKey);
      moved.current = true;
      setExam(null);
      setFinished({
        state,
        score,
        usedMs,
        timedOut,
        newBest: previousBest !== undefined && isBetterAttempt(attempt, previousBest),
      });
      setAnnouncement(
        timedOut
          ? `Time is up. The test was submitted: ${score.correct} of ${score.total} correct.`
          : `Test submitted: ${score.correct} of ${score.total} correct.`,
      );
    },
    [byId, scopeKey],
  );

  // Restore settings, history and a test in progress; an expired test is submitted now.
  useEffect(() => {
    setReviewedOnlySetting(loadSettings().reviewedOnly);
    setHistory(loadExamHistory(scopeKey));
    const stored = loadExam(scopeKey, storedInfo);
    if (stored && isExpired(stored, Date.now())) {
      finish(stored, true);
      moved.current = false; // nothing was clicked: leave focus where the page put it
    } else if (stored) {
      setExam(stored);
      setAnnouncement(
        `Test resumed at question ${stored.position + 1} of ${stored.items.length}. The timer kept running.`,
      );
    }
    setReady(true);
  }, [scopeKey, storedInfo, finish]);

  // Save the test in progress after every change.
  useEffect(() => {
    if (exam) saveExam(exam);
  }, [exam]);

  const view = finished ? "results" : exam ? "running" : "start";
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the view changes.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    viewRef.current?.focus({ preventScroll: true });
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) rootRef.current?.scrollIntoView({ block: "start" });
  }, [view]);

  const start = useCallback(() => {
    const pool = examPool(questions, reviewedOnly).map(toInput);
    const state = createExam(pool, { scope: scopeKey, reviewedOnly, now: Date.now() });
    if (state.items.length === 0) return;
    setFinished(null);
    setAnnouncement("");
    setStartedHere(true);
    setExam(state);
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) rootRef.current?.scrollIntoView({ block: "start" });
  }, [questions, reviewedOnly, scopeKey]);

  const changeReviewedOnly = (value: boolean) => {
    setReviewedOnlySetting(value);
    // Shared with practice mode: "Reviewed only" means the same thing on both pages.
    saveSettings({ ...loadSettings(), reviewedOnly: value });
  };

  return (
    <section
      ref={rootRef}
      className="quiz scroll-mt-4"
      data-ready={ready}
      aria-label={`Timed test: ${scope.title}`}
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="quiz-stage">
        {finished ? (
          <ExamResults
            ref={viewRef}
            result={finished}
            questions={byId}
            scope={scope}
            history={history}
            showTopic={showTopic}
            onNewTest={() => {
              moved.current = true;
              setAnnouncement("");
              setFinished(null);
            }}
          />
        ) : exam ? (
          <ExamRunner
            exam={exam}
            questions={byId}
            showTopic={showTopic}
            focusOnMount={startedHere}
            dispatch={dispatch}
            onSubmit={(timedOut) => finish(exam, timedOut)}
          />
        ) : (
          <ExamStart
            ref={viewRef}
            scope={scope}
            plan={plan}
            reviewedOnly={reviewedOnly}
            reviewedCount={reviewedCount}
            draftCount={eligibleCount - reviewedCount}
            excluded={excluded}
            history={history}
            onReviewedOnly={changeReviewedOnly}
            onStart={start}
          />
        )}
      </div>
    </section>
  );
}
