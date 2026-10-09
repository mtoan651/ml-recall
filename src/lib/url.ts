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
