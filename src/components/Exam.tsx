import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COURSE_TAG, type CourseWeight, courseWeight, DEFAULT_COURSE_WEIGHT } from "../lib/course";
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
import { msg, type Params, scopeName } from "../lib/i18n";
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
  saveResults,
  saveSettings,
  storedExamStart,
} from "../lib/storage";
import type { ExamScopeView, QuizQuestion } from "../lib/types";
import { useT } from "../lib/use-lang";
import { ExamResults, type FinishedExam } from "./ExamResults";
import { ExamRunner } from "./ExamRunner";
import { ExamStart } from "./ExamStart";

interface ExamProps {
  /** Questions of the topic or tag that can be in a test (see `isExamEligible`). */
  questions: QuizQuestion[];
  scope: ExamScopeView;
  /** Show each question's topic (cross-topic sets such as tag pages). */
  showTopic?: boolean;
  /** Questions per test (default `EXAM_MAX_QUESTIONS`). */
  maxQuestions?: number;
  /** Start a test as soon as the page is ready, unless one is resumed (mixed tests). */
  autoStart?: boolean;
  /** "New test" on the results: default back to the start screen. */
  onNewTest?: () => void;
}

const SUBMITTED_ELSEWHERE = msg(
  "This test was submitted in another tab. Its result is in your history.",
);
const OPEN_ELSEWHERE = msg(
  "This test is open in another tab, so it was closed here. Reload the page to continue it in this tab.",
);

/** A message kept as its key, so it follows a change of language while it is shown. */
interface Message {
  key: string;
  params?: Params;
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
export default function Exam({
  questions,
  scope,
  showTopic = false,
  maxQuestions,
  autoStart = false,
  onNewTest,
}: ExamProps) {
  const t = useT();
  const scopeKey = examScope(scope.kind, scope.id);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const storedInfo = useMemo(
    () =>
      new Map<string, StoredQuestionInfo>(
        questions.map((q) => [
          q.id,
          {
            type: q.type,
            optionCount: q.options?.length ?? 0,
            blankCount: q.answer?.blanks?.length ?? 0,
          },
        ]),
      ),
    [questions],
  );
  const poolCount = questions.length;
  const reviewedCount = useMemo(() => examPool(questions, true).length, [questions]);
  const courseIds = useMemo(
    () => new Set(questions.filter((q) => q.tags.includes(COURSE_TAG)).map((q) => q.id)),
    [questions],
  );
  /** Boosting course questions changes the draw only when the pool mixes them with others. */
  const boostable = courseIds.size > 0 && courseIds.size < poolCount;

  // The server renders the start screen; the browser then restores settings, history and a
  // test in progress before showing anything (see `.quiz[data-ready]` in global.css).
  const [ready, setReady] = useState(false);
  const [reviewedOnlySetting, setReviewedOnlySetting] = useState(false);
  const reviewedOnly = reviewedOnlySetting && reviewedCount > 0;
  const [layout, setLayout] = useState<ExamLayout>(DEFAULT_EXAM_LAYOUT);
  const [courseWeightSetting, setCourseWeightSetting] =
    useState<CourseWeight>(DEFAULT_COURSE_WEIGHT);
  const [history, setHistory] = useState<ExamHistory>(EMPTY_HISTORY);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [finished, setFinished] = useState<FinishedExam | null>(null);
  const [announcement, setAnnouncement] = useState<Message | null>(null);
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

  const plan = planExam(reviewedOnly ? reviewedCount : poolCount, maxQuestions);

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
      setAnnouncement({ key: message });
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
      });
      setAnnouncement({
        key: timedOut
          ? msg("Time is up. The test was submitted: {correct} of {total} correct.")
          : msg("Test submitted: {correct} of {total} correct."),
        params: { correct: score.correct, total: score.total },
      });
    },
    [byId, scopeKey, takenElsewhere, yieldToOtherTab],
  );

  /** A new test drawn from the pool. */
  const begin = useCallback(
    (only: boolean, chosenLayout: ExamLayout, boost: CourseWeight) => {
      const pool = examPool(questions, only).map(toInput);
      const state = createExam(pool, {
        scope: scopeKey,
        reviewedOnly: only,
        layout: chosenLayout,
        now: Date.now(),
        max: maxQuestions,
        weight: boost > 1 && boostable ? courseWeight(courseIds, boost) : undefined,
      });
      if (state.items.length === 0) return;
      setFinished(null);
      setNotice("");
      setAnnouncement(null);
      setStartedHere(true);
      setExam(state);
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) rootRef.current?.scrollIntoView({ block: "start" });
    },
    [questions, scopeKey, maxQuestions, boostable, courseIds],
  );
  const autoStarted = useRef(false);

  // Restore settings, history and a test in progress; an expired test is submitted now.
  useEffect(() => {
    const settings = loadSettings();
    setReviewedOnlySetting(settings.reviewedOnly);
    setLayout(settings.examLayout);
    setCourseWeightSetting(settings.courseWeight);
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
      setAnnouncement({
        key: msg("Test resumed at question {n} of {total}. The timer kept running."),
        params: { n: stored.position + 1, total: stored.items.length },
      });
    } else if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      begin(settings.reviewedOnly && reviewedCount > 0, settings.examLayout, settings.courseWeight);
    }
    setReady(true);
  }, [scopeKey, storedInfo, finish, autoStart, begin, reviewedCount]);

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

  const start = useCallback(
    () => begin(reviewedOnly, layout, courseWeightSetting),
    [begin, reviewedOnly, layout, courseWeightSetting],
  );

  const changeReviewedOnly = (value: boolean) => {
    setReviewedOnlySetting(value);
    // Shared with practice mode: "Reviewed only" means the same thing on both pages.
    saveSettings({ ...loadSettings(), reviewedOnly: value });
  };

  const changeLayout = (value: ExamLayout) => {
    setLayout(value);
    saveSettings({ ...loadSettings(), examLayout: value });
  };

  const changeCourseWeight = (value: CourseWeight) => {
    setCourseWeightSetting(value);
    // Shared with the mixed test.
    saveSettings({ ...loadSettings(), courseWeight: value });
  };

  return (
    <section
      ref={rootRef}
      className="quiz scroll-mt-4"
      data-ready={ready}
      data-lang={t.lang}
      aria-label={t("Timed test: {title}", { title: scopeName(t.lang, scope) })}
    >
      <p className="sr-only" aria-live="polite">
        {announcement && t(announcement.key, announcement.params)}
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
              if (onNewTest) {
                onNewTest();
                return;
              }
              moved.current = true;
              setAnnouncement(null);
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
                {t(notice)}
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
              courseCount={boostable ? courseIds.size : 0}
              courseWeight={courseWeightSetting}
              onCourseWeight={changeCourseWeight}
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
