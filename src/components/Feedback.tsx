import { describeAccepted, gradeChoice, inputKeys, isGapFill } from "../lib/grading";
import type { Answer } from "../lib/session";
import type { QuizQuestion } from "../lib/types";
import { useT } from "../lib/use-lang";
import { Figure } from "./Figure";
import { Html } from "./Html";
import { CheckIcon, CrossIcon, MinusIcon } from "./Icons";

/** Shown once a question is answered: verdict, answer key, explanation, references, source. */
export function Feedback({ question: q, answer }: { question: QuizQuestion; answer: Answer }) {
  const t = useT();
  return (
    <div className="mt-5 space-y-5">
      {answer.outcome && <Verdict question={q} answer={answer} />}

      {q.answer && (
        <section
          aria-label={t("Answer")}
          className="rounded-xl border border-line bg-subtle px-4 py-3"
        >
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("Answer")}
          </h3>
          <AcceptedAnswers question={q} />
          {q.answer.modelHtml && <Html html={q.answer.modelHtml} className="mt-2" />}
        </section>
      )}

      {q.explanationHtml ? (
        <section aria-label={t("Explanation")}>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("Explanation")}
          </h3>
          <Html html={q.explanationHtml} className="mt-1.5" />
        </section>
      ) : (
        !q.answer?.modelHtml &&
        !q.options?.some((o) => o.whyHtml) && <MissingExplanation question={q} />
      )}
      {q.explanationFigure && <Figure figure={q.explanationFigure} />}

      {q.references.length > 0 && (
        <section aria-label={t("References")}>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("References")}
          </h3>
          <ol className="mt-1.5 space-y-1 text-sm" lang="en">
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
        {t("Source:")}{" "}
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
  const t = useT();
  const correct = answer.outcome === "correct";
  // Only a timed test grades a blank answer (practice needs an answer before "Check").
  const blank =
    answer.selected.length === 0 && [answer.text, ...answer.blanks].every((s) => s.trim() === "");
  let detail: string | null = null;
  if (!correct && !blank && q.type === "multiple" && q.options) {
    const { missed, wrong } = gradeChoice(
      q.options.map((o) => o.correct),
      answer.selected,
    );
    const m = missed.length;
    const w = wrong.length;
    if (m > 0 && w > 0) {
      detail = t("You missed {missed} and picked {wrong} — all correct options are needed.", {
        missed: t.n(m, "{n} correct option", "{n} correct options"),
        wrong: t.n(w, "{n} wrong option", "{n} wrong options"),
      });
    } else if (m > 0) {
      detail = t.n(
        m,
        "You missed {n} correct option — all correct options are needed.",
        "You missed {n} correct options — all correct options are needed.",
      );
    } else if (w > 0) {
      detail = t.n(
        w,
        "You picked {n} wrong option — all correct options are needed.",
        "You picked {n} wrong options — all correct options are needed.",
      );
    }
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
          {correct ? t("Correct") : blank ? t("Not answered") : t("Not quite")}
        </p>
        {detail && <p className="mt-0.5 text-sm">{detail}</p>}
      </div>
    </div>
  );
}

/** An imported question without a written explanation yet: say so, and point to where to read up. */
function MissingExplanation({ question: q }: { question: QuizQuestion }) {
  const t = useT();
  return (
    <section
      aria-label={t("Explanation")}
      className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted"
    >
      <h3 className="text-xs font-semibold tracking-wide uppercase">{t("Explanation")}</h3>
      <p className="mt-1.5">
        {t("No explanation has been written for this question yet.")}{" "}
        {q.references.length > 0
          ? t("The reference below covers the topic.")
          : q.provenance.url &&
            t.rich("See the original question in {source}.", {
              source: (
                <a
                  href={q.provenance.url}
                  rel="noopener"
                  className="text-accent underline underline-offset-2"
                >
                  {q.provenance.title}
                </a>
              ),
            })}
      </p>
    </section>
  );
}

function AcceptedAnswers({ question: q }: { question: QuizQuestion }) {
  const t = useT();
  const key = q.answer;
  if (!key) return null;
  const note = <span className="sr-only">{t(" (case, spaces and punctuation are ignored)")}</span>;
  if (isGapFill(key)) {
    return (
      <ol className="mt-1.5 space-y-0.5 text-sm">
        {inputKeys(key).map((k, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: blanks are numbered by position.
          <li key={i}>
            <span className="text-muted">{t("Blank {n}:", { n: i + 1 })}</span>{" "}
            <span className="text-ink">{describeAccepted(k, t.lang)}</span>
            {note}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <p className="mt-1.5 text-sm text-ink">
      {describeAccepted(key, t.lang)}
      {note}
    </p>
  );
}
