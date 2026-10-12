/**
 * The owner's NCU course CE6146 *Introduction to Deep Learning*, for the exam-prep page
 * (src/pages/ce6146.astro). Questions written from its slides and in-class exercises (source
 * `ncu-intro-dl`) carry the tag `ce6146` plus one tag per lecture or exercise. Syllabus weeks
 * whose slides are not in the bank yet point at the bank topics that cover them: move a week to
 * COURSE_LECTURES when questions from its slides are added.
 */
import { msg } from "./i18n";

export const COURSE_TAG = "ce6146";

/**
 * How many times as often timed and mixed tests draw a course question as any other question
 * (`QuizSettings.courseWeight`): as often, more, mostly.
 */
export const COURSE_WEIGHTS = [1, 4, 16] as const;
export type CourseWeight = (typeof COURSE_WEIGHTS)[number];
export const DEFAULT_COURSE_WEIGHT: CourseWeight = 4;

export const isCourseWeight = (value: unknown): value is CourseWeight =>
  COURSE_WEIGHTS.includes(value as CourseWeight);

/** Draw weights for a test: `weight` for the ids in `courseIds`, 1 for the rest. */
export const courseWeight =
  (courseIds: ReadonlySet<string>, weight: number) =>
  (id: string): number =>
    courseIds.has(id) ? weight : 1;

export interface CourseUnit {
  /** Translation key of the label. */
  label: string;
  tag: string;
}

export const COURSE_LECTURES: readonly CourseUnit[] = [
  { label: msg("Lecture 1 · Deep learning basics"), tag: "ce6146-l01" },
  { label: msg("Lecture 2 · Feedforward neural networks"), tag: "ce6146-l02" },
  { label: msg("Lecture 3 · Optimization and regularization"), tag: "ce6146-l03" },
];

export const COURSE_EXERCISES: readonly CourseUnit[] = [
  { label: msg("Exercise 1"), tag: "ce6146-ex01" },
  { label: msg("Exercise 2"), tag: "ce6146-ex02" },
  { label: msg("Exercise 3"), tag: "ce6146-ex03" },
];

export interface CourseWeek {
  /** Translation key of the label. */
  label: string;
  /** Bank topics that cover the week. */
  topics: readonly string[];
}

/** Later weeks of the syllabus, in teaching order. */
export const COURSE_UPCOMING: readonly CourseWeek[] = [
  { label: msg("Convolutional neural networks"), topics: ["cnn"] },
  { label: msg("Recurrent neural networks"), topics: ["rnn"] },
  { label: msg("Attention and transformers"), topics: ["transformers"] },
  { label: msg("Graph neural networks"), topics: ["gnn"] },
  { label: msg("Autoencoders and GANs"), topics: ["autoencoders", "gans"] },
  { label: msg("Explainable AI"), topics: ["xai"] },
  { label: msg("Reinforcement learning"), topics: ["rl-basics", "q-learning", "policy-gradient"] },
];
