import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { gradeChoice, gradeShortAnswer, isAutoGraded } from "../lib/grading";
import {
  answerOf,
  createSession,
  currentItem,
  missedIds,
  type Outcome,
  type SessionInput,
  score as scoreOf,
  sessionReducer,
} from "../lib/session";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  type QuizSettings,
  saveResult,
  saveSettings,
} from "../lib/storage";
import type { QuizQuestion } from "../lib/types";
import { QuestionCard } from "./QuestionCard";
import { Summary } from "./Summary";

interface QuizProps {
  questions: QuizQuestion[];
  /** What is being practised, e.g. a topic title or "#tag" (for screen-reader labels). */
  scope: string;
  /** Show each question's topic (cross-topic sets such as tag pages). */
  showTopic?: boolean;
}

const toInput = (q: QuizQuestion): SessionInput => ({
  id: q.id,
  shuffleOptions: q.shuffleOptions,
  optionCount: q.options?.length ?? 0,
});

function pool(questions: QuizQuestion[], settings: QuizSettings, onlyIds?: ReadonlySet<string>) {
  return questions.filter(
    (q) => (!settings.reviewedOnly || q.status === "reviewed") && (!onlyIds || onlyIds.has(q.id)),
  );
}

/** Interactive practice over a list of questions: one question at a time, instant feedback. */
export default function Quiz({ questions, scope, showTopic = false }: QuizProps) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const reviewedCount = useMemo(
    () => questions.filter((q) => q.status === "reviewed").length,
    [questions],
  );
  const draftCount = questions.length - reviewedCount;

  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  // The server renders file order; the browser then applies settings and shuffles once.
  const [ready, setReady] = useState(false);
  const [session, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(questions.map(toInput), { shuffleQuestions: false, shuffleOptions: false }),
  );
  const [hint, setHint] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const focusRef = useRef<HTMLElement>(null);
  const moved = useRef(false);

  const start = useCallback(
    (next: QuizSettings, onlyIds?: ReadonlySet<string>) => {
      const fresh = createSession(pool(questions, next, onlyIds).map(toInput), {
        shuffleQuestions: next.shuffleQuestions,
        shuffleOptions: true,
      });
      dispatch({ type: "restart", session: fresh });
      setHint(null);
      setAnnouncement("");
    },
    [questions],
  );

  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
    start(stored);
    setReady(true);
  }, [start]);

  const item = currentItem(session);
  const question = item ? byId.get(item.id) : undefined;
  const answer = item ? answerOf(session, item.id) : undefined;
  const score = scoreOf(session);

  // Move focus to the new question (or the summary) after "Next", not on first render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the position changes.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const el = focusRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [session.position, session.finished]);

  const grade = useCallback((id: string, outcome: Outcome) => {
    dispatch({ type: "grade", outcome });
    saveResult(id, outcome === "correct");
    setAnnouncement(outcome === "correct" ? "Correct." : "Not quite.");
  }, []);

  const check = useCallback(() => {
    if (!question || !answer || answer.outcome) return;
    if (question.options) {
      if (answer.selected.length === 0) return;
      const result = gradeChoice(
        question.options.map((o) => o.correct),
        answer.selected,
      );
      grade(question.id, result.correct ? "correct" : "incorrect");
      return;
    }
    if (!question.answer) return;
    if (!isAutoGraded(question.answer)) {
      dispatch({ type: "reveal" });
      setAnnouncement("Model answer shown. Did you get it?");
      return;
    }
    const result = gradeShortAnswer(answer.text, question.answer);
    if (result.kind === "graded") grade(question.id, result.correct ? "correct" : "incorrect");
    else if (result.kind === "not-a-number")
      setHint("Enter a number, e.g. 42, -0.5, 1/3 or 2.5e-3.");
    else if (result.kind === "empty") setHint("Type an answer first.");
  }, [question, answer, grade]);

  const next = useCallback(() => {
    moved.current = true;
    setHint(null);
    setAnnouncement("");
    dispatch({ type: "next" });
  }, []);

  const selfGrade = useCallback(
    (outcome: Outcome) => {
      if (question) grade(question.id, outcome);
    },
    [question, grade],
  );

  const select = useCallback(
    (option: number) =>
      dispatch({ type: "select", option, multiple: question?.type === "multiple" }),
    [question],
  );

  /** Enter: check the answer, or go to the next question once it is graded. */
  const primary = useCallback(() => {
    if (!question || !answer) return;
    if (answer.outcome) next();
    else if (!answer.revealed) check();
  }, [question, answer, next, check]);

  // Keyboard: 1–9 pick the n-th shown option, Enter checks / continues.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, select, [contenteditable], [data-quiz-settings]")) return;
      const typing = target instanceof HTMLInputElement && target.type === "text";
      if (typing) return; // the short-answer form handles Enter itself
      const interactive = target?.closest("button, a, summary");

      if (event.key === "Enter") {
        if (interactive) return; // let the focused button or link do its own thing
        event.preventDefault();
        primary();
        return;
      }
      if (/^[1-9]$/.test(event.key) && item && question?.options && !answer?.outcome) {
        const original = item.optionOrder[Number(event.key) - 1];
        if (original === undefined) return;
        event.preventDefault();
        select(original);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary, select, item, question, answer]);

  const updateSettings = (patch: Partial<QuizSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    start(next);
  };

  const isLast = score.current === score.total;
  const selfGradedPending =
    question?.type === "short_answer" && answer?.revealed && !answer.outcome;
  const canCheck = question?.options
    ? (answer?.selected.length ?? 0) > 0
    : !question?.answer || !isAutoGraded(question.answer) || (answer?.text.trim() ?? "") !== "";

  return (
    <section className="quiz" data-ready={ready} aria-label={`Practice: ${scope}`}>
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium tabular-nums">
            {session.finished ? "Done" : `Q ${score.current} / ${score.total}`}
          </span>
          <span className="text-muted tabular-nums">
            Score {score.correct} / {score.answered}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${score.total ? (score.answered / score.total) * 100 : 0}%` }}
          />
        </div>
        <div data-quiz-settings className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={settings.shuffleQuestions}
              onChange={(e) => updateSettings({ shuffleQuestions: e.target.checked })}
            />
            Shuffle questions
          </label>
          {draftCount > 0 && (
            <label
              className={`inline-flex items-center gap-2 ${reviewedCount === 0 ? "opacity-60" : "cursor-pointer"}`}
              title={reviewedCount === 0 ? "No reviewed questions here yet" : undefined}
            >
              <input
                type="checkbox"
                className="size-4"
                checked={settings.reviewedOnly}
                disabled={reviewedCount === 0 && !settings.reviewedOnly}
                onChange={(e) => updateSettings({ reviewedOnly: e.target.checked })}
              />
              Reviewed only ({reviewedCount})
            </label>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="quiz-stage">
        {session.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center sm:px-6">
            <p className="text-muted">No reviewed questions in this set yet.</p>
            <button
              type="button"
              onClick={() => updateSettings({ reviewedOnly: false })}
              className="mt-4 rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
            >
              Include unreviewed questions
            </button>
          </div>
        ) : session.finished ? (
          <Summary
            ref={focusRef}
            score={score}
            missed={missedIds(session).flatMap((id) => byId.get(id) ?? [])}
            onRetryMissed={() => start(settings, new Set(missedIds(session)))}
            onRestart={() => start(settings)}
          />
        ) : (
          item &&
          question &&
          answer && (
            <>
              <QuestionCard
                key={`${item.id}-${session.position}`}
                ref={focusRef}
                question={question}
                item={item}
                answer={answer}
                number={score.current}
                showTopic={showTopic}
                hint={hint}
                onSelect={select}
                onText={(text) => {
                  setHint(null);
                  dispatch({ type: "type", text });
                }}
                onSubmitText={primary}
              />

              <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-xl sm:border-t-0 sm:px-0">
                <div className="flex items-center justify-end gap-2">
                  <span className="mr-auto hidden text-xs text-muted sm:inline">
                    {question.options
                      ? "Keys: 1–9 select · Enter check / next"
                      : "Enter: check / next"}
                  </span>
                  {selfGradedPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => selfGrade("incorrect")}
                        className="rounded-lg border border-line-strong bg-surface px-4 py-2 font-medium hover:bg-subtle"
                      >
                        I missed it
                      </button>
                      <button
                        type="button"
                        onClick={() => selfGrade("correct")}
                        className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
                      >
                        I got it
                      </button>
                    </>
                  ) : answer.outcome ? (
                    <button
                      type="button"
                      onClick={next}
                      className="rounded-lg bg-accent px-5 py-2 font-medium text-accent-ink hover:bg-accent-hover"
                    >
                      {isLast ? "See results" : "Next question"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={check}
                      disabled={!canCheck}
                      className="rounded-lg bg-accent px-5 py-2 font-medium text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {question.answer && !isAutoGraded(question.answer) ? "Show answer" : "Check"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}
