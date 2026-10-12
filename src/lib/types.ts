/**
 * The serializable view of a question that pages pass to the React quiz island. Everything is
 * resolved at build time: Markdown is already HTML, figure paths are URLs, source ids are
 * titles. Optional fields are omitted (not `undefined`) to keep the page payload small.
 */

export type QuestionType = "single" | "multiple" | "true_false" | "short_answer";
export type Difficulty = "easy" | "medium" | "hard";

export interface FigureView {
  src: string;
  alt: string;
  captionHtml?: string;
}

export interface OptionView {
  html: string;
  correct: boolean;
  whyHtml?: string;
  image?: FigureView;
}

/** How one typed input is graded: a whole short answer, or one blank of a gap-fill. */
export interface InputKeyView {
  accept: string[];
  numeric?: number;
  tolerance: number;
  /** Regex source, matched in full and case-insensitively (src/lib/grading.ts). */
  pattern?: string;
  /** Format guidance with the input (plain text). */
  hint?: string;
}

export interface AnswerKeyView extends InputKeyView {
  /**
   * Gap-fill: one key per blank, in order. The question HTML then holds
   * `<span class="blank" data-blank="n">` where each input goes.
   */
  blanks?: InputKeyView[];
  /** Optional worked answer shown after answering. */
  modelHtml?: string;
}

export interface ReferenceView {
  /** 1-based number used by the `[^n]` markers. */
  n: number;
  /** Anchor id that citation links point to. */
  anchor: string;
  title: string;
  locator?: string;
  url?: string;
  quote?: string;
}

export interface ProvenanceView {
  title: string;
  license: string;
  licenseUrl?: string;
  url?: string;
  /** Locator inside the source, e.g. `machine_learning/31`. */
  ref: string;
}

export interface TopicRef {
  id: string;
  title: string;
  url: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  status: "draft" | "reviewed";
  /** Set on reviewed questions: the owner, or Claude at the owner's request. */
  reviewedBy?: "owner" | "claude";
  difficulty?: Difficulty;
  tags: string[];
  topic: TopicRef;
  /** False when the options must keep their file order. */
  shuffleOptions: boolean;
  questionHtml: string;
  figure?: FigureView;
  options?: OptionView[];
  answer?: AnswerKeyView;
  explanationHtml?: string;
  explanationFigure?: FigureView;
  references: ReferenceView[];
  provenance: ProvenanceView;
}

/** The topic or tag a timed test is about, or a mixed test over a chosen selection. */
export interface ExamScopeView {
  kind: "topic" | "tag" | "mixed";
  /** Topic id, tag, or the id of a mixed selection. */
  id: string;
  /** For headings: the topic title, `#tag` or "your selection". */
  title: string;
  /** Practice page of the same topic or tag (for a mixed test: "My mistakes"). */
  practiceUrl: string;
  /** Label of the practice link; default "Practice this <kind>". */
  practiceLabel?: string;
}

/**
 * The question index that cross-topic pages (mixed tests, My mistakes, Progress) embed: ids
 * grouped by domain and topic, with what filters need. Questions themselves are fetched one
 * by one from `data/q/<id>.json` (src/pages/data/q/[id].json.ts).
 */
export interface Catalog {
  domains: CatalogDomain[];
}

export interface CatalogDomain {
  id: string;
  title: string;
  topics: CatalogTopic[];
}

export interface CatalogTopic {
  id: string;
  title: string;
  url: string;
  /** Visible question ids, in file order. */
  ids: string[];
  /** One letter per id: difficulty `e` / `m` / `h`, or `-` when unset. */
  difficulty: string;
  /** One letter per id: `r` reviewed, `d` draft. */
  status: string;
}

/**
 * Tag → the questions with that tag, as one string: `tag:p.p.p tag2:p …`, where each `p` is a
 * position in catalog order (`catalogEntries`) in base 36. One flat string keeps the mixed-test
 * page small (every tag, ~60 KB) — island props would wrap and escape each entry of an object.
 */
export type CatalogTags = string;
