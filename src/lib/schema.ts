/**
 * Zod mirror of the pydantic models in tools/mlrecall/schema.py — the Python model is the single
 * source of truth (spec: docs/data-format.md). Keep field names, defaults, constraints and
 * cross-field rules in sync; `schema.test.ts` compares this file with the exported JSON Schemas
 * in schema/*.schema.json, and the Astro build fails on any violation.
 */
import { z } from "astro/zod";
import { citationMarkers } from "./citations";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QUESTION_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$/;

const slug = z.string().regex(SLUG_RE, "must be kebab-case: a-z, 0-9 and single hyphens");
const questionId = z.string().regex(QUESTION_ID_RE, "must look like <topic>-<NNN>, e.g. cnn-009");
const text = z.string().min(1);
/** pydantic `HttpUrl`: absolute http(s) URL only (also keeps `javascript:` out of hrefs). */
const httpUrl = z.url({ protocol: /^https?$/ });
/** pydantic `str | None = None` (YAML `null` or absent). */
const optionalText = z.string().nullish();

// --------------------------------------------------------------------------- questions

export const figureSchema = z.strictObject({
  src: text,
  alt: z.string().min(10),
  caption: optionalText,
});

export const optionSchema = z.strictObject({
  text,
  correct: z.boolean().default(false),
  why: optionalText,
  image: figureSchema.nullish(),
});

export const referenceSchema = z
  .strictObject({
    source: slug.nullish(),
    title: optionalText,
    url: httpUrl.nullish(),
    locator: optionalText,
    quote: z.string().max(300).nullish(),
  })
  .refine((r) => Boolean(r.source || r.url || r.title), {
    error: "reference needs at least one of: source, url, title",
  });

export const provenanceSchema = z.strictObject({
  id: slug,
  ref: text,
  url: httpUrl.nullish(),
});

export const shortAnswerSchema = z.strictObject({
  accept: z.array(text).default([]),
  numeric: z.number().nullish(),
  tolerance: z.number().min(0).default(0),
  model: text,
});

export const QUESTION_TYPES = ["single", "multiple", "true_false", "short_answer"] as const;
export const CHOICE_TYPES = ["single", "multiple", "true_false"] as const;

const questionObject = z.strictObject({
  id: questionId,
  type: z.enum(QUESTION_TYPES),
  difficulty: z.enum(["easy", "medium", "hard"]).nullish(),
  tags: z.array(slug).default([]),
  shuffle: z.boolean().default(true),
  question: text,
  figure: figureSchema.nullish(),
  options: z.array(optionSchema).min(2).max(8).nullish(),
  answer: shortAnswerSchema.nullish(),
  explanation: optionalText,
  explanation_figure: figureSchema.nullish(),
  references: z.array(referenceSchema).default([]),
  source: provenanceSchema,
  status: z.enum(["draft", "reviewed", "retired"]),
});

export const questionSchema = questionObject.superRefine((q, ctx) => {
  for (const message of questionProblems(q)) ctx.addIssue({ code: "custom", message });
});

type QuestionShape = z.output<typeof questionObject>;

/** Cross-field rules of `Question._consistent` / `_check_choices` in schema.py. */
function questionProblems(q: QuestionShape): string[] {
  const problems: string[] = [];
  const isChoice = (CHOICE_TYPES as readonly string[]).includes(q.type);

  if (isChoice) {
    const options = q.options ?? [];
    if (options.length === 0 || q.answer) {
      problems.push(`${q.type}: needs \`options\` and no \`answer\``);
    } else {
      const nCorrect = options.filter((o) => o.correct).length;
      if (q.type === "multiple") {
        if (nCorrect < 1) problems.push("multiple: needs at least one correct option");
      } else if (nCorrect !== 1) {
        problems.push(`${q.type}: needs exactly one correct option, found ${nCorrect}`);
      }
      if (q.type === "true_false" && options.length !== 2) {
        problems.push("true_false: needs exactly two options");
      }
      const texts = options.map((o) => o.text.trim().toLowerCase());
      if (new Set(texts).size !== texts.length) problems.push("duplicate option text");
    }
  } else if ((q.options && q.options.length > 0) || !q.answer) {
    problems.push("short_answer: needs `answer` and no `options`");
  }

  if (q.status === "reviewed") {
    const missing = (["explanation", "difficulty"] as const).filter((f) => !q[f]);
    if (missing.length > 0) problems.push(`reviewed questions need: ${missing.join(", ")}`);
    else if (citationMarkers(q.explanation).length === 0) {
      problems.push("reviewed questions need a cited explanation ([^n] marker)");
    }
  }

  const scanned = [q.question, q.explanation, q.answer?.model];
  for (const o of q.options ?? []) scanned.push(o.text, o.why);
  for (const n of scanned.flatMap((t) => citationMarkers(t))) {
    if (n < 1 || n > q.references.length) {
      problems.push(`citation [^${n}] has no matching reference (${q.references.length} given)`);
    }
  }
  return problems;
}

export const quizFileSchema = z.strictObject({
  schema_version: z.literal(1).default(1),
  domain: slug,
  topic: slug,
  title: text,
  description: optionalText,
  questions: z.array(questionSchema).default([]),
});

// --------------------------------------------------------------------------- taxonomy

export const topicSchema = z.strictObject({
  id: slug,
  title: text,
  description: optionalText,
});

export const domainSchema = z.strictObject({
  id: slug,
  title: text,
  topics: z.array(topicSchema),
});

export const taxonomySchema = z.strictObject({
  schema_version: z.literal(1).default(1),
  domains: z.array(domainSchema),
});

// --------------------------------------------------------------------------- sources

export const sourceSchema = z.strictObject({
  id: slug,
  title: text,
  author: optionalText,
  kind: z.enum([
    "course",
    "book",
    "exam",
    "dataset",
    "puzzles",
    "paper",
    "lecture",
    "website",
    "original",
  ]),
  url: httpUrl.nullish(),
  repo: httpUrl.nullish(),
  license: text,
  license_url: httpUrl.nullish(),
  usage: z.enum(["adapt", "reference", "original", "private"]),
  pinned: optionalText,
  covers: z.array(slug).default([]),
  plan: optionalText,
  notes: optionalText,
});

export const sourceRegistrySchema = z.strictObject({
  schema_version: z.literal(1).default(1),
  sources: z.array(sourceSchema),
});

export type Figure = z.output<typeof figureSchema>;
export type Option = z.output<typeof optionSchema>;
export type Reference = z.output<typeof referenceSchema>;
export type Question = z.output<typeof questionSchema>;
export type QuizFile = z.output<typeof quizFileSchema>;
export type Domain = z.output<typeof domainSchema>;
export type Topic = z.output<typeof topicSchema>;
export type Source = z.output<typeof sourceSchema>;

/** Human-readable list of Zod issues, one per line, with the YAML path of each. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
