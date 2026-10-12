/**
 * Zod mirror of the pydantic models in tools/mlrecall/schema.py — the Python model is the single
 * source of truth (spec: docs/data-format.md). Keep field names, defaults, constraints and
 * cross-field rules in sync; `schema.test.ts` compares this file with the exported JSON Schemas
 * in schema/*.schema.json, and the Astro build fails on any violation.
 */
import { z } from "astro/zod";
import { allBlankMarkers, blankMarkers, citationMarkers } from "./citations";
import { compilePattern, matchesPattern } from "./grading";

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

/** Python-only regex syntax that JavaScript rejects or reads differently (`ShortAnswer` in schema.py). */
const NON_JS_REGEX_TOKENS = ["(?P", "\\A", "\\Z", "(?#", "(?i", "(?x", "(?s", "(?m"];

const answerKeyShape = {
  accept: z.array(text).default([]),
  numeric: z.number().nullish(),
  tolerance: z.number().min(0).default(0),
  pattern: text.nullish(),
  hint: text.nullish(),
};

type AnswerKeyShape = { accept: string[]; pattern?: string | null | undefined };

/** Pattern rules of `AnswerKey._valid_pattern` in schema.py, plus `accept` ⊂ pattern. */
function patternProblems(key: AnswerKeyShape, ctx: z.RefinementCtx, path: (string | number)[]) {
  const { pattern } = key;
  if (!pattern) return;
  const token = NON_JS_REGEX_TOKENS.find((t) => pattern.includes(t));
  if (token) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "pattern"],
      message: `'${token}' is not valid JavaScript regex syntax`,
    });
  } else if (!compilePattern(pattern)) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "pattern"],
      message: "pattern does not compile",
    });
  } else {
    // Also checked by `mlr check`: the canonical answers must pass the pattern.
    const misses = key.accept.filter((a) => !matchesPattern(a, pattern));
    if (misses.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: [...path, "accept"],
        message: `accepted answers don't match \`pattern\`: ${misses.join(" | ")}`,
      });
    }
  }
}

const graded = (k: { accept: string[]; numeric?: number | null; pattern?: string | null }) =>
  k.accept.length > 0 || typeof k.numeric === "number" || Boolean(k.pattern);

export const answerKeySchema = z.strictObject(answerKeyShape).superRefine((key, ctx) => {
  if (!graded(key)) {
    ctx.addIssue({ code: "custom", message: "set numeric, accept or pattern" });
  }
  patternProblems(key, ctx, []);
});

/** `ShortAnswer` in schema.py: one auto-graded input, or a gap-fill with one key per blank. */
export const shortAnswerSchema = z
  .strictObject({
    ...answerKeyShape,
    blanks: z.array(answerKeySchema).default([]),
    model: text.nullish(),
  })
  .superRefine((answer, ctx) => {
    if (answer.blanks.length > 0 && graded(answer)) {
      ctx.addIssue({
        code: "custom",
        message: "use either `blanks` (gap-fill) or accept/numeric/pattern, not both",
      });
    } else if (answer.blanks.length === 0 && !graded(answer)) {
      ctx.addIssue({
        code: "custom",
        message:
          "short answers are auto-graded: set numeric, accept or pattern (or `blanks` for a gap-fill)",
      });
    }
    patternProblems(answer, ctx, []);
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
  /** Who reviewed it: the repository owner, or Claude at the owner's request. */
  reviewed_by: z.enum(["owner", "claude"]).nullish(),
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
  } else {
    // `Question._check_blanks` in schema.py.
    const found = blankMarkers(q.question);
    if (allBlankMarkers(q.question).length !== found.length) {
      problems.push("blanks {{n}} must be in plain text, not inside code or math");
    } else {
      const expected = q.answer.blanks.map((_, i) => i + 1);
      if (found.join(",") !== expected.join(",")) {
        problems.push(
          `question blanks [${found.join(", ")}] don't match the ${expected.length} \`blanks\` keys`,
        );
      }
    }
  }

  if (q.status === "reviewed") {
    const missing = (["explanation", "difficulty", "reviewed_by"] as const).filter((f) => !q[f]);
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

// --------------------------------------------------------------------------- notes

/** Front matter of a topic note (src/content/notes/<domain>/<topic>.md); mirrors `Note`. */
export const noteSchema = z
  .strictObject({
    topic: slug,
    summary: z.string().min(1).max(200),
    status: z.enum(["draft", "reviewed"]).default("draft"),
    reviewed_by: z.enum(["owner", "claude"]).nullish(),
    references: z.array(referenceSchema).min(2),
  })
  .refine((n) => n.status !== "reviewed" || Boolean(n.reviewed_by), {
    error: "a reviewed note needs reviewed_by",
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
export type AnswerKey = z.output<typeof answerKeySchema>;
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
