/**
 * Topic notes (cheat sheets): src/content/notes/<domain>/<topic>.md, validated by `noteSchema`
 * and `mlr check`. The body is rendered with the question pipeline (src/lib/markdown.ts: KaTeX,
 * Shiki, `[^n]` citations linking to the reference list) — see docs/web-app.md#topic-notes.
 */
import { getCollection } from "astro:content";
import type { Bank } from "./bank";
import { referenceAnchor } from "./citations";
import { renderMarkdown } from "./markdown";
import type { ReferenceView } from "./types";

export interface NoteView {
  topicId: string;
  summary: string;
  status: "draft" | "reviewed";
  reviewedBy?: "owner" | "claude";
  html: string;
  references: ReferenceView[];
  /** Reading time at ~200 words a minute (prose only), at least 1. */
  minutes: number;
}

/** Prose words: code blocks and math do not count (like `mlr check`). */
export function proseWords(markdown: string): number {
  const text = markdown
    .replace(/^```[\s\S]*?^```/gm, "")
    .replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, "");
  return text.match(/[A-Za-z][A-Za-z'-]*/g)?.length ?? 0;
}

/** Anchor prefix of a note's references (`ref-note-cnn-1`), distinct from question ids. */
export const noteCitePrefix = (topicId: string): string => `note-${topicId}`;

async function loadNotes(bank: Bank): Promise<Map<string, NoteView>> {
  const entries = await getCollection("notes");
  const problems: string[] = [];
  const notes = new Map<string, NoteView>();
  for (const entry of entries) {
    const n = entry.data;
    const where = `src/content/notes/${entry.id}.md`;
    const topic = bank.topics.get(n.topic);
    if (!topic) {
      problems.push(`${where}: unknown topic '${n.topic}'`);
      continue;
    }
    if (entry.id !== `${topic.domainId}/${topic.id}`) {
      problems.push(`${where}: must be src/content/notes/${topic.domainId}/${topic.id}.md`);
      continue;
    }
    const prefix = noteCitePrefix(topic.id);
    const body = entry.body ?? "";
    const html = await renderMarkdown(body, {
      citePrefix: prefix,
      refCount: n.references.length,
      context: where,
    });
    const references: ReferenceView[] = n.references.map((r, i) => {
      const registered = r.source ? bank.sources.get(r.source) : undefined;
      if (r.source && !registered) problems.push(`${where}: unknown source '${r.source}'`);
      const url = r.url ?? registered?.url;
      return {
        n: i + 1,
        anchor: referenceAnchor(prefix, i + 1),
        title: registered?.title ?? r.title ?? r.url ?? `Reference ${i + 1}`,
        ...(r.locator ? { locator: r.locator } : {}),
        ...(url ? { url } : {}),
        ...(r.quote ? { quote: r.quote } : {}),
      };
    });
    notes.set(topic.id, {
      topicId: topic.id,
      summary: n.summary,
      status: n.status,
      ...(n.reviewed_by ? { reviewedBy: n.reviewed_by } : {}),
      html,
      references,
      minutes: Math.max(1, Math.round(proseWords(body) / 200)),
    });
  }
  if (problems.length > 0) throw new Error(`Topic notes:\n  ${problems.join("\n  ")}`);
  return notes;
}

let cached: Promise<Map<string, NoteView>> | undefined;

/** Every topic's note, by topic id (cached in production builds, like the bank). */
export function getNotes(bank: Bank): Promise<Map<string, NoteView>> {
  if (!import.meta.env.PROD) return loadNotes(bank);
  cached ??= loadNotes(bank);
  return cached;
}
