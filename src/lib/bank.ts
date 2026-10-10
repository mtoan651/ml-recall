/**
 * Build-time view of the question bank: joins the content collections (quizzes, taxonomy,
 * source registry), checks cross-references the Zod schema cannot see, and turns questions
 * into the render-ready `QuizQuestion` props of the quiz island.
 *
 * Only import this from .astro pages (it uses `astro:content`).
 */

import { getCollection } from "astro:content";
import { posix } from "node:path";
import { referenceAnchor } from "./citations";
import { isExamEligible } from "./exam";
import { renderMarkdown } from "./markdown";
import type { Figure, Question, Source } from "./schema";
import { shufflesOptions } from "./shuffle";
import type { FigureView, QuizQuestion, ReferenceView } from "./types";
import { topicUrl } from "./url";

/** Figures next to the YAML files, bundled by Vite: "/src/content/quizzes/dl/cnn/x.svg" → URL. */
const FIGURE_URLS = import.meta.glob<string>(
  "/src/content/quizzes/**/*.{svg,png,jpg,jpeg,webp,gif,avif}",
  { eager: true, query: "?url", import: "default" },
);

export interface TopicInfo {
  id: string;
  title: string;
  description?: string;
  domainId: string;
  domainTitle: string;
  url: string;
  /** Visible (non-retired) question ids, in file order. */
  questionIds: string[];
  reviewed: number;
}

export interface DomainInfo {
  id: string;
  title: string;
  topics: TopicInfo[];
}

export interface BankQuestion {
  question: Question;
  topic: TopicInfo;
  /** YAML file, relative to the project root. */
  filePath: string;
}

export interface Bank {
  domains: DomainInfo[];
  topics: Map<string, TopicInfo>;
  /** Visible questions in taxonomy order, then file order. Retired questions are dropped. */
  questions: BankQuestion[];
  sources: Map<string, Source>;
  /** Tag → visible questions with that tag, sorted by tag. */
  tags: Map<string, BankQuestion[]>;
}

async function loadBank(): Promise<Bank> {
  const [quizEntries, domainEntries, sourceEntries] = await Promise.all([
    getCollection("quizzes"),
    getCollection("domains"),
    getCollection("sources"),
  ]);
  const problems: string[] = [];
  const sources = new Map(sourceEntries.map((e) => [e.data.id, e.data]));

  const domains: DomainInfo[] = [];
  const topics = new Map<string, TopicInfo>();
  for (const { data: d } of [...domainEntries].sort((a, b) => a.data.order - b.data.order)) {
    const domain: DomainInfo = { id: d.id, title: d.title, topics: [] };
    for (const t of d.topics) {
      if (topics.has(t.id)) problems.push(`taxonomy.yaml: duplicate topic id "${t.id}"`);
      const topic: TopicInfo = {
        id: t.id,
        title: t.title,
        ...(t.description ? { description: t.description } : {}),
        domainId: d.id,
        domainTitle: d.title,
        url: topicUrl(t.id),
        questionIds: [],
        reviewed: 0,
      };
      topics.set(t.id, topic);
      domain.topics.push(topic);
    }
    domains.push(domain);
  }

  const byTopic = new Map<string, BankQuestion[]>();
  const seenIds = new Map<string, string>();
  for (const entry of quizEntries) {
    const filePath = entry.filePath ?? entry.id;
    const quiz = entry.data;
    const [domainDir, topicFile] = posix.relative("src/content/quizzes", filePath).split("/");
    const where = filePath;
    if (topicFile !== `${quiz.topic}.yaml`) {
      problems.push(`${where}: topic "${quiz.topic}" does not match the file name`);
    }
    if (domainDir !== quiz.domain) {
      problems.push(`${where}: domain "${quiz.domain}" does not match the folder`);
    }
    const topic = topics.get(quiz.topic);
    if (!topic) {
      problems.push(`${where}: topic "${quiz.topic}" is not in taxonomy.yaml`);
      continue;
    }
    if (topic.domainId !== quiz.domain) {
      problems.push(`${where}: topic "${quiz.topic}" belongs to domain "${topic.domainId}"`);
    }
    if (byTopic.has(topic.id)) problems.push(`${where}: second file for topic "${topic.id}"`);
    if (quiz.description && !topic.description) topic.description = quiz.description;

    const visible: BankQuestion[] = [];
    for (const q of quiz.questions) {
      const other = seenIds.get(q.id);
      if (other) problems.push(`${where}: duplicate question id ${q.id} (also in ${other})`);
      seenIds.set(q.id, where);
      problems.push(...crossReferenceProblems(q, sources, filePath));
      if (q.status === "retired") continue;
      visible.push({ question: q, topic, filePath });
      topic.questionIds.push(q.id);
      if (q.status === "reviewed") topic.reviewed++;
    }
    byTopic.set(topic.id, visible);
  }

  if (problems.length > 0) {
    throw new Error(
      `The question bank has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`,
    );
  }

  const questions = domains.flatMap((d) => d.topics.flatMap((t) => byTopic.get(t.id) ?? []));
  const tags = new Map<string, BankQuestion[]>();
  for (const bq of questions) {
    for (const tag of bq.question.tags) tags.set(tag, [...(tags.get(tag) ?? []), bq]);
  }
  const sortedTags = new Map([...tags.entries()].sort(([a], [b]) => a.localeCompare(b)));
  return { domains, topics, questions, sources, tags: sortedTags };
}

function crossReferenceProblems(
  q: Question,
  sources: Map<string, Source>,
  filePath: string,
): string[] {
  const problems: string[] = [];
  const at = `${filePath}: ${q.id}`;
  const provenance = sources.get(q.source.id);
  if (!provenance) problems.push(`${at}: unknown source.id "${q.source.id}"`);
  else if (provenance.usage === "reference") {
    problems.push(`${at}: source.id "${q.source.id}" is reference-only; cite it instead`);
  }
  q.references.forEach((r, i) => {
    if (r.source && !sources.has(r.source)) {
      problems.push(`${at}: references[${i}].source "${r.source}" is not in sources.yaml`);
    }
  });
  const figures: Array<[string, Figure | null | undefined]> = [
    ["figure", q.figure],
    ["explanation_figure", q.explanation_figure],
    ...(q.options ?? []).map((o, i): [string, Figure | null | undefined] => [
      `options[${i}].image`,
      o.image,
    ]),
  ];
  for (const [field, figure] of figures) {
    if (figure && !figureUrl(filePath, figure.src)) {
      problems.push(`${at}: ${field} "${figure.src}" not found next to the YAML file`);
    }
  }
  return problems;
}

/** URL of a figure whose `src` is relative to the YAML file, or undefined if missing. */
function figureUrl(filePath: string, src: string): string | undefined {
  const absolute = posix.normalize(posix.join("/", posix.dirname(filePath), src));
  return FIGURE_URLS[absolute];
}

/** The questions of `list` that can be in a timed test (auto-gradable). */
export function examQuestions(list: readonly BankQuestion[]): BankQuestion[] {
  return list.filter((bq) => isExamEligible(bq.question));
}

// Cache across pages in production builds only: in dev, content edits must show up on reload.
let cached: Promise<Bank> | undefined;

export function getBank(): Promise<Bank> {
  if (!import.meta.env.PROD) return loadBank();
  cached ??= loadBank();
  return cached;
}

// --------------------------------------------------------------------------- rendering

const renderCache = new Map<string, Promise<QuizQuestion>>();

/** Render-ready props for the quiz island (Markdown → HTML, ids → titles, paths → URLs). */
export function toQuizQuestion(bq: BankQuestion, bank: Bank): Promise<QuizQuestion> {
  if (!import.meta.env.PROD) return renderQuestion(bq, bank);
  const key = bq.question.id;
  let rendered = renderCache.get(key);
  if (!rendered) {
    rendered = renderQuestion(bq, bank);
    renderCache.set(key, rendered);
  }
  return rendered;
}

async function renderQuestion(
  { question: q, topic, filePath }: BankQuestion,
  bank: Bank,
): Promise<QuizQuestion> {
  const md = (text: string, field: string, inline = false) =>
    renderMarkdown(text, {
      citePrefix: q.id,
      refCount: q.references.length,
      context: `${filePath} ${q.id} ${field}`,
      inline,
    });
  const figure = async (f: Figure | null | undefined): Promise<FigureView | undefined> => {
    if (!f) return undefined;
    const src = figureUrl(filePath, f.src) as string; // existence checked in loadBank
    return {
      src,
      alt: f.alt,
      ...(f.caption ? { captionHtml: await md(f.caption, "figure caption") } : {}),
    };
  };

  const source = bank.sources.get(q.source.id) as Source; // checked in loadBank
  const references: ReferenceView[] = q.references.map((r, i) => {
    const registered = r.source ? bank.sources.get(r.source) : undefined;
    const n = i + 1;
    // A registry source without its own URL links to the work's home page.
    const url = r.url ?? registered?.url;
    return {
      n,
      anchor: referenceAnchor(q.id, n),
      title: registered?.title ?? r.title ?? r.url ?? `Reference ${n}`,
      ...(r.locator ? { locator: r.locator } : {}),
      ...(url ? { url } : {}),
      ...(r.quote ? { quote: r.quote } : {}),
    };
  });

  const options = q.options
    ? await Promise.all(
        q.options.map(async (o, i) => {
          const image = await figure(o.image);
          return {
            html: await md(o.text, `options[${i}].text`, true),
            correct: o.correct,
            ...(o.why ? { whyHtml: await md(o.why, `options[${i}].why`) } : {}),
            ...(image ? { image } : {}),
          };
        }),
      )
    : undefined;

  const [questionHtml, questionFigure, explanationHtml, explanationFigure, modelHtml] =
    await Promise.all([
      md(q.question, "question"),
      figure(q.figure),
      q.explanation ? md(q.explanation, "explanation") : undefined,
      figure(q.explanation_figure),
      q.answer ? md(q.answer.model, "answer.model") : undefined,
    ]);

  const provenanceUrl = q.source.url ?? source.url;
  return {
    id: q.id,
    type: q.type,
    status: q.status === "reviewed" ? "reviewed" : "draft",
    ...(q.difficulty ? { difficulty: q.difficulty } : {}),
    tags: q.tags,
    topic: { id: topic.id, title: topic.title, url: topic.url },
    shuffleOptions: shufflesOptions(q),
    questionHtml,
    ...(questionFigure ? { figure: questionFigure } : {}),
    ...(options ? { options } : {}),
    ...(q.answer && modelHtml !== undefined
      ? {
          answer: {
            accept: q.answer.accept,
            ...(typeof q.answer.numeric === "number" ? { numeric: q.answer.numeric } : {}),
            tolerance: q.answer.tolerance,
            ...(q.answer.pattern ? { pattern: q.answer.pattern } : {}),
            ...(q.answer.hint ? { hint: q.answer.hint } : {}),
            modelHtml,
          },
        }
      : {}),
    ...(explanationHtml ? { explanationHtml } : {}),
    ...(explanationFigure ? { explanationFigure } : {}),
    references,
    provenance: {
      title: source.title,
      license: source.license,
      ...(source.license_url ? { licenseUrl: source.license_url } : {}),
      ...(provenanceUrl ? { url: provenanceUrl } : {}),
      ref: q.source.ref,
    },
  };
}

/** Renders questions one after another (keeps memory and KaTeX warnings in order). */
export async function toQuizQuestions(
  list: readonly BankQuestion[],
  bank: Bank,
): Promise<QuizQuestion[]> {
  const out: QuizQuestion[] = [];
  for (const bq of list) out.push(await toQuizQuestion(bq, bank));
  return out;
}
