import { type Ref, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  answerHint,
  gradeChoice,
  gradeInputs,
  type InputKey,
  inputKeys,
  isGapFill,
  isNumericOnly,
} from "../lib/grading";
import type { Answer, SessionItem } from "../lib/session";
import type { QuestionType, QuizQuestion } from "../lib/types";
import { Feedback } from "./Feedback";
import { Figure } from "./Figure";
import { Html } from "./Html";
import { CheckIcon, CrossIcon } from "./Icons";

const TYPE_LABEL: Record<QuestionType, string> = {
  single: "Single choice",
  multiple: "Select all that apply",
  true_false: "True or false",
  short_answer: "Short answer",
};

interface QuestionCardProps {
  question: QuizQuestion;
  item: SessionItem;
  answer: Answer;
  /** 1-based position in the session. */
  number: number;
  showTopic: boolean;
  /**
   * Problem with the typed answer, shown in red under the input (e.g. "Type an answer first").
   * The format hint from the answer key is shown separately, always.
   */
  inputError: string | null;
  onSelect: (option: number) => void;
  /** Typing into the answer, or into blank `blank` (0-based) of a gap-fill. */
  onText: (text: string, blank?: number) => void;
  onSubmitText: () => void;
  /** The card is focused when it becomes the current question. */
  ref?: Ref<HTMLElement>;
}

export function QuestionCard({
  question: q,
  item,
  answer,
  number,
  showTopic,
  inputError,
  onSelect,
  onText,
  onSubmitText,
  ref,
}: QuestionCardProps) {
  const headingId = `q-${q.id}-heading`;
  const showFeedback = Boolean(answer.outcome);
  const gapFill = q.answer ? isGapFill(q.answer) : false;
  const questionRef = useRef<HTMLDivElement>(null);
  return (
    <article
      ref={ref}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 shadow-xs outline-none sm:p-6"
    >
      <header
        data-pagefind-ignore
        className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs"
      >
        <h2 id={headingId} className="font-medium text-muted">
          <span className="sr-only">Question {number}: </span>
          {TYPE_LABEL[q.type]}
        </h2>
        {q.difficulty && (
          <span className="rounded-full bg-subtle px-2 py-0.5 text-muted">{q.difficulty}</span>
        )}
        {q.status === "draft" && (
          <span
            className="rounded-full bg-note-soft px-2 py-0.5 text-note"
            title="Imported or generated and not yet checked; may contain errors."
          >
            unreviewed
          </span>
        )}
        {q.reviewedBy === "claude" && (
          <span
            className="rounded-full bg-subtle px-2 py-0.5 text-muted"
            title="Checked by Claude (an AI model) at the owner's request: key re-derived, explanation cited. Not yet verified by a human."
          >
            AI-checked
          </span>
        )}
        {showTopic && (
          <a
            href={q.topic.url}
            className="ml-auto text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {q.topic.title}
          </a>
        )}
      </header>

      <Html
        ref={questionRef}
        html={q.questionHtml}
        className="mt-3 text-[1.0625rem] leading-loose text-ink"
      />
      {gapFill && (
        <GapFillInputs
          question={q}
          answer={answer}
          container={questionRef}
          onText={onText}
          onSubmit={onSubmitText}
        />
      )}
      {q.figure && <Figure figure={q.figure} />}

      <div className="mt-5">
        {q.options ? (
          <OptionList question={q} item={item} answer={answer} onSelect={onSelect} />
        ) : gapFill ? (
          <InputMessages question={q} inputError={inputError} graded={Boolean(answer.outcome)} />
        ) : (
          <ShortAnswerInput
            question={q}
            answer={answer}
            inputError={inputError}
            onText={onText}
            onSubmit={onSubmitText}
          />
        )}
      </div>

      {showFeedback && <Feedback question={q} answer={answer} />}
    </article>
  );
}

function OptionList({
  question: q,
  item,
  answer,
  onSelect,
}: {
  question: QuizQuestion;
  item: SessionItem;
  answer: Answer;
  onSelect: (option: number) => void;
}) {
  const options = q.options ?? [];
  const multiple = q.type === "multiple";
  const graded = Boolean(answer.outcome);
  // Picture options (every option has an image) are laid out as a grid, two per row.
  const pictures = options.length >= 2 && options.every((o) => o.image);
  const result = graded
    ? gradeChoice(
        options.map((o) => o.correct),
        answer.selected,
      )
    : null;

  return (
    <fieldset className="min-w-0">
      <legend data-pagefind-ignore className="sr-only">
        {multiple ? "Select all options that apply" : "Choose one option"}
      </legend>
      <ul className={pictures ? "grid gap-2.5 sm:grid-cols-2" : "space-y-2.5"}>
        {item.optionOrder.map((original, k) => {
          const option = options[original];
          if (!option) return null;
          const selected = answer.selected.includes(original);
          const inputId = `q-${q.id}-o${original}`;
          let tone = selected
            ? "border-accent bg-accent-soft"
            : "border-line hover:border-line-strong hover:bg-subtle";
          if (graded) {
            if (option.correct) tone = "border-good bg-good-soft";
            else if (selected) tone = "border-bad bg-bad-soft";
            else tone = "border-line";
          }
          const missed = result?.missed.includes(original);
          return (
            <li key={original} className={`rounded-xl border transition-colors ${tone}`}>
              <label
                htmlFor={inputId}
                className={`flex items-start gap-3 px-3.5 py-3 sm:px-4 ${graded ? "" : "cursor-pointer"}`}
              >
                <input
                  id={inputId}
                  type={multiple ? "checkbox" : "radio"}
                  name={`q-${q.id}`}
                  checked={selected}
                  disabled={graded}
                  onChange={() => onSelect(original)}
                  className="mt-1 size-4 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <Html html={option.html} inline />
                  {option.image && <Figure figure={option.image} compact />}
                </span>
                {graded ? (
                  <OptionVerdict
                    correct={option.correct}
                    selected={selected}
                    missed={Boolean(missed)}
                  />
                ) : (
                  k < 9 && (
                    <kbd className="hidden shrink-0 rounded border border-line px-1.5 font-sans text-xs text-muted sm:inline-block">
                      {k + 1}
                    </kbd>
                  )
                )}
              </label>
              {graded && option.whyHtml && (
                <Html
                  html={option.whyHtml}
                  className="border-t border-line/70 px-3.5 py-2.5 pl-10.5 text-sm text-muted sm:px-4 sm:pl-11"
                />
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function OptionVerdict({
  correct,
  selected,
  missed,
}: {
  correct: boolean;
  selected: boolean;
  missed: boolean;
}) {
  if (correct) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-good">
        <CheckIcon />
        {selected ? "Your answer" : missed ? "Missed" : "Correct"}
      </span>
    );
  }
  if (selected) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-bad">
        <CrossIcon />
        Your answer
      </span>
    );
  }
  return null;
}

/** Border and background of a typed input: neutral, or green/red once graded. */
function inputTone(graded: boolean, correct: boolean | undefined): string {
  if (!graded) return "border-line-strong bg-canvas read-only:bg-subtle focus:border-accent";
  return correct ? "border-good bg-good-soft" : "border-bad bg-bad-soft";
}

function ShortAnswerInput({
  question: q,
  answer,
  inputError,
  onText,
  onSubmit,
}: {
  question: QuizQuestion;
  answer: Answer;
  inputError: string | null;
  onText: (text: string) => void;
  onSubmit: () => void;
}) {
  const key = q.answer;
  if (!key) return null;
  const numericOnly = isNumericOnly(key);
  const inputId = `q-${q.id}-answer`;
  const formatId = `${inputId}-format`;
  const errorId = `${inputId}-error`;
  const describedBy = [formatId, inputError ? errorId : ""].filter(Boolean).join(" ");
  const locked = Boolean(answer.outcome);
  const tone = inputTone(locked, answer.outcome === "correct");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted">
        Your answer
      </label>
      <input
        id={inputId}
        type="text"
        inputMode={numericOnly ? "decimal" : "text"}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={answer.text}
        readOnly={locked}
        aria-describedby={describedBy}
        aria-invalid={inputError ? true : undefined}
        placeholder={numericOnly ? "Type a number" : "Type your answer"}
        onChange={(event) => onText(event.target.value)}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none ${tone}`}
      />
      <p id={formatId} className="mt-1.5 text-sm text-muted">
        {answerHint(key)}
      </p>
      {inputError && (
        <p id={errorId} className="mt-1 text-sm text-bad">
          {inputError}
        </p>
      )}
    </form>
  );
}

/** Under a gap-fill: how to answer, and problems with what was typed. */
function InputMessages({
  question: q,
  inputError,
  graded,
}: {
  question: QuizQuestion;
  inputError: string | null;
  graded: boolean;
}) {
  if (graded) return null;
  return (
    <div id={`q-${q.id}-blanks-help`} data-pagefind-ignore className="text-sm">
      <p className="text-muted">
        Fill in every blank
        {q.answer && inputKeys(q.answer).some((k) => k.hint) ? " (hints in the boxes)" : ""}. Enter
        moves to the next blank.
      </p>
      {inputError && <p className="mt-1 text-bad">{inputError}</p>}
    </div>
  );
}

/**
 * The inputs of a gap-fill, rendered into the `<span class="blank" data-blank="n">` placeholders
 * of the question HTML (React portals, so the build-time HTML stays untouched).
 */
function GapFillInputs({
  question: q,
  answer,
  container,
  onText,
  onSubmit,
}: {
  question: QuizQuestion;
  answer: Answer;
  container: { current: HTMLDivElement | null };
  onText: (text: string, blank: number) => void;
  onSubmit: () => void;
}) {
  const [slots, setSlots] = useState<HTMLElement[]>([]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the slots belong to this question's HTML.
  useLayoutEffect(() => {
    const spans = container.current?.querySelectorAll<HTMLElement>("span.blank[data-blank]");
    setSlots(
      spans ? [...spans].sort((a, b) => Number(a.dataset.blank) - Number(b.dataset.blank)) : [],
    );
  }, [q.questionHtml]);

  const key = q.answer;
  if (!key) return null;
  const keys = inputKeys(key);
  const locked = Boolean(answer.outcome);
  const grades = locked ? gradeInputs(key, answer.blanks) : [];

  return (
    <>
      {slots.map((slot, i) => {
        const k: InputKey | undefined = keys[i];
        if (!k) return null;
        const grade = grades[i];
        const correct = grade?.kind === "graded" && grade.correct;
        const numeric = isNumericOnly(k);
        return createPortal(
          <input
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode={numeric ? "decimal" : "text"}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={answer.blanks[i] ?? ""}
            readOnly={locked}
            aria-label={`Blank ${i + 1} of ${keys.length}${k.hint ? ` (${k.hint})` : ""}`}
            aria-describedby={`q-${q.id}-blanks-help`}
            placeholder={k.hint ?? (numeric ? "number" : "")}
            onChange={(event) => onText(event.target.value, i)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const next = inputs.current[i + 1];
              if (next && !locked) next.focus();
              else onSubmit();
            }}
            className={`mx-1 inline-block w-36 max-w-full rounded-lg border px-2 py-0.5 align-baseline text-base text-ink placeholder:text-xs placeholder:text-muted/70 focus:outline-none ${inputTone(locked, correct)}`}
          />,
          slot,
          `blank-${i}`,
        );
      })}
    </>
  );
}
