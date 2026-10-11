import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createExam,
  DEFAULT_EXAM_LAYOUT,
  EMPTY_HISTORY,
  type ExamAction,
  type ExamAttempt,
  type ExamHistory,
  type ExamLayout,
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
  browserStore,
  clearExam,
  examKey,
  loadExam,
  loadExamHistory,
  loadSettings,
  saveExam,
  saveExamAttempt,
  saveResult,
  saveResults,
  saveSettings,
  storedExamStart,
  updateExamAttempt,
} from "../lib/storage";
import type { ExamScopeView, QuizQuestion } from "../lib/types";
import { ExamResults, type FinishedExam } from "./ExamResults";
import { ExamRunner } from "./ExamRunner";
import { ExamStart } from "./ExamStart";

interface ExamProps {
  /** Questions of the topic or tag that can be in a test (see `isExamEligible`). */
  questions: QuizQuestion[];
  scope: ExamScopeView;
  /** Show each question's topic (cross-topic sets such as tag pages). */
  showTopic?: boolean;
}

const SUBMITTED_ELSEWHERE =
  "This test was submitted in another tab. Its result is in your history.";
const OPEN_ELSEWHERE =
  "This test is open in another tab, so it was closed here. Reload the page to continue it in this tab.";

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
export default function Exam({ questions, scope, showTopic = false }: ExamProps) {
  const scopeKey = examScope(scope.kind, scope.id);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const storedInfo = useMemo(
    () =>
      new Map<string, StoredQuestionInfo>(
        questions.map((q) => [q.id, { type: q.type, optionCount: q.options?.length ?? 0 }]),
      ),
    [questions],
  );
  const poolCount = questions.length;
  const reviewedCount = useMemo(() => examPool(questions, true).length, [questions]);

  // The server renders the start screen; the browser then restores settings, history and a
  // test in progress before showing anything (see `.quiz[data-ready]` in global.css).
  const [ready, setReady] = useState(false);
  const [reviewedOnlySetting, setReviewedOnlySetting] = useState(false);
  const reviewedOnly = reviewedOnlySetting && reviewedCount > 0;
  const [layout, setLayout] = useState<ExamLayout>(DEFAULT_EXAM_LAYOUT);
  const [history, setHistory] = useState<ExamHistory>(EMPTY_HISTORY);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [finished, setFinished] = useState<FinishedExam | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [startedHere, setStartedHere] = useState(false);
  /** Shown on the start screen after another tab took the test over. */
  const [notice, setNotice] = useState("");
  /** `startedAt` of the last finished test: the timer and a click must not submit twice. */
  const submittedStart = useRef<number | null>(null);
  /**
   * The test this tab owns. `guarded` is false when it could not be stored, so there is nothing
   * to compare with other tabs.
   */
  const owned = useRef<{ startedAt: number; guarded: boolean } | null>(null);
  const viewRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  /** Move focus to the new view (start screen or results) after a user action. */
  const moved = useRef(false);

  const plan = planExam(reviewedOnly ? reviewedCount : poolCount);

  const dispatch = useCallback(
    (action: ExamAction) => setExam((state) => (state ? examReducer(state, action) : state)),
    [],
  );

  /** True when another tab replaced or submitted `state` (only one tab may record a test). */
  const takenElsewhere = useCallback(
    (state: ExamState) => {
      if (!browserStore()) return false;
      const own = owned.current;
      if (own?.startedAt === state.startedAt && !own.guarded) return false;
      return storedExamStart(scopeKey) !== state.startedAt;
    },
    [scopeKey],
  );

  /** Stop the test here and leave it to the other tab. */
  const yieldToOtherTab = useCallback(
    (message: string) => {
      owned.current = null;
      moved.current = true;
      setExam(null);
      setHistory(loadExamHistory(scopeKey));
      setNotice(message);
      setAnnouncement(message);
    },
    [scopeKey],
  );

  const finish = useCallback(
    (state: ExamState, timedOut: boolean) => {
      if (submittedStart.current === state.startedAt) return;
      if (takenElsewhere(state)) {
        yieldToOtherTab(storedExamStart(scopeKey) === null ? SUBMITTED_ELSEWHERE : OPEN_ELSEWHERE);
        return;
      }
      submittedStart.current = state.startedAt;
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
        finishedAt: end,
        usedMs,
        timedOut,
        newBest: previousBest !== undefined && isBetterAttempt(attempt, previousBest),
        selfGrades: {},
        attempt,
        previousBest,
      });
      const toGrade =
        score.pending > 0 ? ` ${score.pending} open answers are waiting for your own grade.` : "";
      setAnnouncement(
        (timedOut
          ? `Time is up. The test was submitted: ${score.correct} of ${score.total} correct.`
          : `Test submitted: ${score.correct} of ${score.total} correct.`) + toGrade,
      );
    },
    [byId, scopeKey, takenElsewhere, yieldToOtherTab],
  );

  // Restore settings, history and a test in progress; an expired test is submitted now.
  useEffect(() => {
    const settings = loadSettings();
    setReviewedOnlySetting(settings.reviewedOnly);
    setLayout(settings.examLayout);
    setHistory(loadExamHistory(scopeKey));
    const stored = loadExam(scopeKey, storedInfo);
    // A stored test whose questions changed (retired, new options) cannot be resumed: drop it
    // so the topic page stops offering "Resume test".
    if (!stored && storedExamStart(scopeKey) !== null) clearExam(scopeKey);
    if (stored) owned.current = { startedAt: stored.startedAt, guarded: true };
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

  // Save the test in progress after every change. The first save of a new test claims the
  // storage key; later saves stop if another tab has written or cleared it meanwhile.
  useEffect(() => {
    if (!exam) return;
    if (owned.current?.startedAt !== exam.startedAt) {
      owned.current = { startedAt: exam.startedAt, guarded: saveExam(exam) };
    } else if (takenElsewhere(exam)) {
      yieldToOtherTab(storedExamStart(scopeKey) === null ? SUBMITTED_ELSEWHERE : OPEN_ELSEWHERE);
    } else {
      saveExam(exam);
    }
  }, [exam, scopeKey, takenElsewhere, yieldToOtherTab]);

  // Another tab wrote or cleared this test (storage events only reach the other tabs): the last
  // tab to change it keeps it.
  const running = exam !== null;
  useEffect(() => {
    if (!running) return;
    const key = examKey(scopeKey);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== key) return;
      yieldToOtherTab(event.newValue === null ? SUBMITTED_ELSEWHERE : OPEN_ELSEWHERE);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [running, scopeKey, yieldToOtherTab]);

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
    const state = createExam(pool, { scope: scopeKey, reviewedOnly, layout, now: Date.now() });
    if (state.items.length === 0) return;
    setFinished(null);
    setNotice("");
    setAnnouncement("");
    setStartedHere(true);
    setExam(state);
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) rootRef.current?.scrollIntoView({ block: "start" });
  }, [questions, reviewedOnly, layout, scopeKey]);

  /** The learner compared an open answer with the model answer: rescore and update history. */
  const selfGrade = (id: string, right: boolean) => {
    if (!finished) return;
    const selfGrades = { ...finished.selfGrades, [id]: right };
    const score = scoreExam(finished.state, byId, selfGrades);
    const attempt = { ...finished.attempt, correct: score.correct };
    setHistory(updateExamAttempt(scopeKey, finished.finishedAt, score.correct));
    saveResult(id, right, undefined, finished.finishedAt);
    setFinished({
      ...finished,
      selfGrades,
      score,
      attempt,
      newBest:
        finished.previousBest !== undefined && isBetterAttempt(attempt, finished.previousBest),
    });
    setAnnouncement(`Score: ${score.correct} of ${score.total} correct.`);
  };

  const changeReviewedOnly = (value: boolean) => {
    setReviewedOnlySetting(value);
    // Shared with practice mode: "Reviewed only" means the same thing on both pages.
    saveSettings({ ...loadSettings(), reviewedOnly: value });
  };

  const changeLayout = (value: ExamLayout) => {
    setLayout(value);
    saveSettings({ ...loadSettings(), examLayout: value });
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
            onSelfGrade={selfGrade}
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
          <>
            {notice && (
              <p
                role="status"
                className="mb-4 rounded-xl border border-note/40 bg-note-soft px-4 py-3 text-sm text-note"
              >
                {notice}
              </p>
            )}
            <ExamStart
              ref={viewRef}
              scope={scope}
              plan={plan}
              reviewedOnly={reviewedOnly}
              reviewedCount={reviewedCount}
              draftCount={poolCount - reviewedCount}
              layout={layout}
              history={history}
              onReviewedOnly={changeReviewedOnly}
              onLayout={changeLayout}
              onStart={start}
            />
          </>
        )}
      </div>
    </section>
  );
}
