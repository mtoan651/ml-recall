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

export interface AnswerKeyView {
  accept: string[];
  numeric?: number;
  tolerance: number;
  modelHtml: string;
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
