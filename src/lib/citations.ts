/**
 * Citation markers: `[^1]`, `[^2]`, … are 1-based indexes into a question's `references`.
 *
 * Two consumers:
 * - validation (`citationMarkers`) mirrors `citation_markers()` in tools/mlrecall/schema.py
 *   exactly, so the build rejects the same files as `mlr check`;
 * - rendering (`splitCitations`) runs on Markdown *text* nodes only, so markers inside code
 *   and math are never touched (those are separate node types in the syntax tree).
 */

/** One marker; global so it can be used with `matchAll`. */
const MARKER_RE = /\[\^(\d+)\]/g;

/** Same alternation as `_CODE_OR_MATH_RE` in schema.py (Python `re.DOTALL` → `[\s\S]`). */
const CODE_OR_MATH_RE = /```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g;

/**
 * A run of markers, optionally separated by whitespace, plus the whitespace in front of it:
 * `"28 [^1][^2]."` → match `" [^1][^2]"`.
 */
const GROUP_RE = /[ \t]*\[\^\d+\](?:[ \t]*\[\^\d+\])*/g;

/** Citation numbers used in `text`, ignoring code spans/blocks and math. */
export function citationMarkers(text: string | null | undefined): number[] {
  if (!text) return [];
  const prose = text.replace(CODE_OR_MATH_RE, "");
  return [...prose.matchAll(MARKER_RE)].map((m) => Number(m[1]));
}

export type CitationPart = { type: "text"; value: string } | { type: "cite"; numbers: number[] };

/**
 * Splits plain prose into text and citation groups. Whitespace before a group is dropped so
 * the superscript hugs the word it supports: `"28 [^1]."` → `"28"`, cite `[1]`, `"."`.
 * Adjacent markers form one group: `"[^1][^2]"` → cite `[1, 2]`.
 */
export function splitCitations(text: string): CitationPart[] {
  const parts: CitationPart[] = [];
  let last = 0;
  for (const match of text.matchAll(GROUP_RE)) {
    const start = match.index;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    const numbers = [...match[0].matchAll(MARKER_RE)].map((m) => Number(m[1]));
    parts.push({ type: "cite", numbers });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

/** Anchor id of reference `n` of a question; citation links point here. */
export function referenceAnchor(prefix: string, n: number): string {
  return `ref-${prefix}-${n}`;
}
