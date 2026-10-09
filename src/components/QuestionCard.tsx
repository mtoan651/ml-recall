import type { Ref } from "react";
import { gradeChoice, isAutoGraded } from "../lib/grading";
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
  /** Message under the short-answer input, e.g. "Enter a number". */
  hint: string | null;
  onSelect: (option: number) => void;
  onText: (text: string) => void;
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
  hint,
  onSelect,
  onText,
  onSubmitText,
  ref,
}: QuestionCardProps) {
  const headingId = `q-${q.id}-heading`;
  const showFeedback = Boolean(answer.outcome || answer.revealed);
  return (
    <article
      ref={ref}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 shadow-xs outline-none sm:p-6"
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
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
            title="Imported or generated and not yet checked by a human; may contain errors."
          >
            unreviewed
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

      <Html html={q.questionHtml} className="mt-3 text-[1.0625rem] text-ink" />
      {q.figure && <Figure figure={q.figure} />}

      <div className="mt-5">
        {q.options ? (
          <OptionList question={q} item={item} answer={answer} onSelect={onSelect} />
        ) : (
          <ShortAnswerInput
            question={q}
            answer={answer}
            hint={hint}
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
  const result = graded
    ? gradeChoice(
        options.map((o) => o.correct),
        answer.selected,
      )
    : null;

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">
        {multiple ? "Select all options that apply" : "Choose one option"}
      </legend>
      <ul className="space-y-2.5">
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

function ShortAnswerInput({
  question: q,
  answer,
  hint,
  onText,
  onSubmit,
}: {
  question: QuizQuestion;
  answer: Answer;
  hint: string | null;
  onText: (text: string) => void;
  onSubmit: () => void;
}) {
  const key = q.answer;
  if (!key) return null;
  const auto = isAutoGraded(key);
  const numericOnly = typeof key.numeric === "number" && key.accept.length === 0;
  const inputId = `q-${q.id}-answer`;
  const hintId = `${inputId}-hint`;
  const locked = Boolean(answer.outcome || answer.revealed);
  const tone =
    answer.outcome === "correct"
      ? "border-good bg-good-soft"
      : answer.outcome === "incorrect"
        ? "border-bad bg-bad-soft"
        : "border-line-strong bg-canvas read-only:bg-subtle focus:border-accent";
  const field = `w-full rounded-xl border px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none ${tone}`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted">
        {auto ? "Your answer" : "Your answer (optional — compare it with the model answer)"}
      </label>
      {auto ? (
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
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={hint ? true : undefined}
          placeholder={numericOnly ? "A number, e.g. 42 or 0.5" : "Type your answer"}
          onChange={(event) => onText(event.target.value)}
          className={field}
        />
      ) : (
        <textarea
          id={inputId}
          rows={3}
          value={answer.text}
          readOnly={locked}
          placeholder="Write down your answer before revealing the model answer"
          onChange={(event) => onText(event.target.value)}
          className={`${field} resize-y`}
        />
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-bad">
          {hint}
        </p>
      )}
    </form>
  );
}
