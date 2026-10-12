/**
 * Internal links. The site lives under a base path (`/ml-recall/` on GitHub Pages), so never
 * hard-code `/…` hrefs — build them here from `import.meta.env.BASE_URL`.
 */

/** `url("topics/cnn/")` → `/ml-recall/topics/cnn/`. */
export function url(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");
  return base + path.replace(/^\/+/, "");
}

export const topicUrl = (topicId: string): string => url(`topics/${topicId}/`);
export const tagUrl = (tag: string): string => url(`tags/${tag}/`);
/** Timed test of a topic or tag (docs/web-app.md#timed-tests). */
export const topicExamUrl = (topicId: string): string => url(`topics/${topicId}/exam/`);
export const tagExamUrl = (tag: string): string => url(`tags/${tag}/exam/`);
/** Timed test over a chosen mix of topics, tags and difficulties; `tag` preselects one tag. */
export const mixedExamUrl = (tag?: string): string =>
  url(tag ? `exam/?tag=${encodeURIComponent(tag)}` : "exam/");
/** Mixed test preset to these topics, all difficulties, no tag. */
export const mixedExamTopicsUrl = (topics: readonly string[]): string =>
  url(`exam/?topics=${topics.map(encodeURIComponent).join(",")}`);
/** Questions answered wrong last time, to practise again. */
export const mistakesUrl = (): string => url("mistakes/");
export const progressUrl = (): string => url("progress/");
/** Questions due for spaced repetition. */
export const reviewUrl = (): string => url("review/");
/** One rendered question as JSON (`QuizQuestion`), fetched by the cross-topic pages. */
export const questionDataUrl = (id: string): string => url(`data/q/${id}.json`);
