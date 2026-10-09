/**
 * Build-time Markdown → HTML for question text, options, feedback, explanations and model
 * answers: CommonMark + GFM, KaTeX math, Shiki code highlighting and citation superscripts.
 *
 * Raw HTML in content is never rendered (remark-rehype runs without `allowDangerousHtml`), so
 * `<mask>` must be written as `\<mask>` in the YAML — see docs/data-format.md.
 */
import rehypeShiki from "@shikijs/rehype";
import type { ElementContent, Root as HastRoot } from "hast";
import type { Data, Root as MdastRoot, Node, Parent, PhrasingContent } from "mdast";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { VFile } from "vfile";
import { referenceAnchor, splitCitations } from "./citations";

/** A group of citation markers, rendered as `<sup class="cite"><a href="#ref-…">1</a></sup>`. */
interface CitationNode extends Node {
  type: "citation";
  numbers: number[];
  data: Data;
}

declare module "mdast" {
  interface PhrasingContentMap {
    citation: CitationNode;
  }
  interface RootContentMap {
    citation: CitationNode;
  }
}

export interface RenderOptions {
  /** Unique per question on a page; prefixes the reference anchors (`ref-<prefix>-<n>`). */
  citePrefix: string;
  /** Number of references of the question; markers outside 1..refCount are not linked. */
  refCount: number;
  /** Where the text comes from, for error messages (e.g. `cnn-007 options[1].text`). */
  context?: string;
  /** Unwrap a lone paragraph, for text shown inline (option labels). */
  inline?: boolean;
}

const SOURCE_KATEX_STRICT = "katex-strict";

/** rehype-katex with KaTeX "strict" findings reported on the file instead of the console. */
function rehypeMath() {
  return (tree: HastRoot, file: VFile) => {
    rehypeKatex({
      strict: (code: string, message: string) => {
        file.message(message, { ruleId: code, source: SOURCE_KATEX_STRICT });
        return "ignore";
      },
    })(tree, file);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  // KaTeX must run before Shiki: display math arrives as <pre><code class="language-math">.
  .use(rehypeMath)
  .use(rehypeShiki, {
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false, // colors come from CSS variables, see src/styles/global.css
    langs: [],
    lazy: true,
    defaultLanguage: "text",
    fallbackLanguage: "text",
  })
  .use(rehypeStringify)
  .freeze();

function citationNode(numbers: number[], options: RenderOptions): CitationNode {
  const children: ElementContent[] = [];
  numbers.forEach((n, i) => {
    if (i > 0) children.push({ type: "text", value: "," });
    const label: ElementContent = { type: "text", value: String(n) };
    if (n >= 1 && n <= options.refCount) {
      children.push({
        type: "element",
        tagName: "a",
        properties: {
          href: `#${referenceAnchor(options.citePrefix, n)}`,
          className: ["cite-link"],
          ariaLabel: `Reference ${n}`,
        },
        children: [label],
      });
    } else {
      children.push(label);
    }
  });
  return {
    type: "citation",
    numbers,
    data: { hName: "sup", hProperties: { className: ["cite"] }, hChildren: children },
  };
}

/**
 * Replaces `[^n]` markers in prose with citation nodes. Code (`inlineCode`, `code`) and math
 * (`inlineMath`, `math`) are separate node types, so markers inside them stay untouched.
 */
export function transformCitations(tree: MdastRoot, options: RenderOptions): void {
  visit(tree, (node, index, parent) => {
    if (!parent || index === undefined) return;
    const siblings = (parent as Parent).children;
    if (node.type === "footnoteReference" && /^\d+$/.test(node.identifier)) {
      // Only parsed as a footnote when a `[^n]: …` definition exists; treat it as a citation.
      siblings.splice(index, 1, citationNode([Number(node.identifier)], options));
      return [SKIP, index + 1];
    }
    if (node.type === "footnoteDefinition") {
      siblings.splice(index, 1);
      return [SKIP, index];
    }
    if (node.type !== "text" || parent.type === "link" || parent.type === "linkReference") {
      return;
    }
    const parts = splitCitations(node.value);
    if (parts.every((p) => p.type === "text")) return;
    const replacement: PhrasingContent[] = parts.map((p) =>
      p.type === "text" ? { type: "text", value: p.value } : citationNode(p.numbers, options),
    );
    siblings.splice(index, 1, ...replacement);
    return [SKIP, index + replacement.length];
  });
}

/** `<p>text</p>` → `text` when the document is a single paragraph. */
function unwrapParagraph(tree: HastRoot): void {
  const blocks = tree.children.filter((n) => !(n.type === "text" && n.value.trim() === ""));
  const [only] = blocks;
  if (blocks.length === 1 && only?.type === "element" && only.tagName === "p") {
    tree.children = only.children;
  }
}

/**
 * Renders Markdown to an HTML string. Throws when KaTeX cannot render a formula, so broken
 * math fails the build with the question id in the message instead of shipping red error text.
 */
export async function renderMarkdown(markdown: string, options: RenderOptions): Promise<string> {
  const file = new VFile({ value: markdown });
  const tree = processor.parse(file);
  transformCitations(tree, options);
  const hast = await processor.run(tree, file);
  if (options.inline) unwrapParagraph(hast);
  const html = processor.stringify(hast, file);

  const where = options.context ?? options.citePrefix;
  const errors = file.messages.filter((m) => m.source !== SOURCE_KATEX_STRICT);
  if (errors.length > 0) {
    const details = errors.map((m) => `  - ${m.reason}${m.cause ? `: ${String(m.cause)}` : ""}`);
    throw new Error(`Cannot render Markdown in ${where}:\n${details.join("\n")}`);
  }
  for (const m of file.messages)
    console.warn(`[markdown] ${where}: KaTeX ${m.ruleId}: ${m.reason}`);
  return html;
}
