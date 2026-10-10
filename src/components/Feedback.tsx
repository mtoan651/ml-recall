import { gradeChoice } from "../lib/grading";
import type { Answer } from "../lib/session";
import type { QuizQuestion } from "../lib/types";
import { Figure } from "./Figure";
import { Html } from "./Html";
import { CheckIcon, CrossIcon, MinusIcon } from "./Icons";

/** Shown once a question is answered: verdict, model answer, explanation, references, source. */
export function Feedback({ question: q, answer }: { question: QuizQuestion; answer: Answer }) {
  return (
    <div className="mt-5 space-y-5">
      {answer.outcome && <Verdict question={q} answer={answer} />}

      {q.answer && (
        <section
          aria-label="Model answer"
          className="rounded-xl border border-line bg-subtle px-4 py-3"
        >
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Model answer</h3>
          <Html html={q.answer.modelHtml} className="mt-1.5" />
          <AcceptedAnswers question={q} />
        </section>
      )}

      {q.explanationHtml && (
        <section aria-label="Explanation">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Explanation</h3>
          <Html html={q.explanationHtml} className="mt-1.5" />
        </section>
      )}
      {q.explanationFigure && <Figure figure={q.explanationFigure} />}

      {q.references.length > 0 && (
        <section aria-label="References">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">References</h3>
          <ol className="mt-1.5 space-y-1 text-sm">
            {q.references.map((r) => (
              <li key={r.n} id={r.anchor} className="ref-item flex scroll-mt-4 gap-2 px-1 py-0.5">
                <span className="w-5 shrink-0 text-right text-muted tabular-nums">{r.n}.</span>
                <span className="min-w-0">
                  {r.url ? (
                    <a
                      href={r.url}
                      rel="noopener"
                      className="text-accent underline underline-offset-2"
                    >
                      {r.title}
                    </a>
                  ) : (
                    <span className="font-medium">{r.title}</span>
                  )}
                  {r.locator && <span className="text-muted"> — {r.locator}</span>}
                  {r.quote && <q className="mt-0.5 block text-muted italic">{r.quote}</q>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="border-t border-line pt-3 text-xs text-muted">
        Source:{" "}
        {q.provenance.url ? (
          <a
            href={q.provenance.url}
            rel="noopener"
            className="underline underline-offset-2 hover:text-ink"
          >
            {q.provenance.title}
          </a>
        ) : (
          q.provenance.title
        )}{" "}
        (
        {q.provenance.licenseUrl ? (
          <a
            href={q.provenance.licenseUrl}
            rel="noopener license"
            className="underline underline-offset-2 hover:text-ink"
          >
            {q.provenance.license}
          </a>
        ) : (
          q.provenance.license
        )}
        ) · <span className="font-mono">{q.id}</span>
      </p>
    </div>
  );
}

function Verdict({ question: q, answer }: { question: QuizQuestion; answer: Answer }) {
  const correct = answer.outcome === "correct";
  const selfGraded = q.type === "short_answer" && answer.revealed;
  // Only a timed test grades a blank answer (practice needs an answer before "Check").
  const blank = !selfGraded && answer.selected.length === 0 && answer.text.trim() === "";
  let detail: string | null = null;
  if (!correct && !blank && q.type === "multiple" && q.options) {
    const { missed, wrong } = gradeChoice(
      q.options.map((o) => o.correct),
      answer.selected,
    );
    const parts = [];
    if (missed.length)
      parts.push(`missed ${missed.length} correct ${plural(missed.length, "option")}`);
    if (wrong.length) parts.push(`picked ${wrong.length} wrong ${plural(wrong.length, "option")}`);
    if (parts.length) detail = `You ${parts.join(" and ")} — all correct options are needed.`;
  }
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${
        correct ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
      }`}
    >
      {correct ? (
        <CheckIcon className="mt-0.5 size-5" />
      ) : blank ? (
        <MinusIcon className="mt-0.5 size-5" />
      ) : (
        <CrossIcon className="mt-0.5 size-5" />
      )}
      <div>
        <p className="font-semibold">
          {selfGraded
            ? correct
              ? "Marked as known"
              : "Marked for another round"
            : correct
              ? "Correct"
              : blank
                ? "Not answered"
                : "Not quite"}
        </p>
        {detail && <p className="mt-0.5 text-sm">{detail}</p>}
      </div>
    </div>
  );
}

function AcceptedAnswers({ question: q }: { question: QuizQuestion }) {
  const key = q.answer;
  if (!key) return null;
  const accepted: string[] = [];
  if (typeof key.numeric === "number") {
    accepted.push(key.tolerance > 0 ? `${key.numeric} ± ${key.tolerance}` : String(key.numeric));
  }
  accepted.push(...key.accept);
  if (accepted.length === 0) return null;
  return (
    <p className="mt-2 text-sm text-muted">
      Accepted: {accepted.join(" · ")}
      <span className="sr-only"> (case, spaces and punctuation are ignored)</span>
    </p>
  );
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
