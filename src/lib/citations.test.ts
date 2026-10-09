import { describe, expect, it } from "vitest";
import { citationMarkers, referenceAnchor, splitCitations } from "./citations";
import { renderMarkdown } from "./markdown";

describe("citationMarkers (mirror of schema.py citation_markers)", () => {
  it("finds markers in prose", () => {
    expect(citationMarkers("Pooling has no parameters [^1], BN has two [^2][^1].")).toEqual([
      1, 2, 1,
    ]);
  });

  it("ignores markers inside code and math", () => {
    const text = "Use `a[^1]` and $x[^2]$ and $$y[^3]$$ and\n```\nz[^4]\n```\nbut cite [^5].";
    expect(citationMarkers(text)).toEqual([5]);
  });

  it("handles empty input", () => {
    expect(citationMarkers(undefined)).toEqual([]);
    expect(citationMarkers(null)).toEqual([]);
    expect(citationMarkers("")).toEqual([]);
  });
});

describe("splitCitations", () => {
  it("returns plain text untouched", () => {
    expect(splitCitations("no markers here")).toEqual([{ type: "text", value: "no markers here" }]);
  });

  it("drops the space before a marker so it hugs the word", () => {
    expect(splitCitations("output is 28 [^1].")).toEqual([
      { type: "text", value: "output is 28" },
      { type: "cite", numbers: [1] },
      { type: "text", value: "." },
    ]);
  });

  it("groups adjacent markers", () => {
    expect(splitCitations("both [^1] [^2] agree")).toEqual([
      { type: "text", value: "both" },
      { type: "cite", numbers: [1, 2] },
      { type: "text", value: " agree" },
    ]);
  });

  it("handles a marker at the start and multi-digit numbers", () => {
    expect(splitCitations("[^12]x")).toEqual([
      { type: "cite", numbers: [12] },
      { type: "text", value: "x" },
    ]);
  });

  it("does not treat other brackets as markers", () => {
    expect(splitCitations("mask token [MASK] and [^a] and [1]")).toEqual([
      { type: "text", value: "mask token [MASK] and [^a] and [1]" },
    ]);
  });
});

describe("citations in rendered Markdown", () => {
  const render = (md: string, refCount = 2) =>
    renderMarkdown(md, { citePrefix: "cnn-008", refCount });

  it("renders markers as superscript links to the reference list", async () => {
    const html = await render("The output is 28 [^1].");
    expect(html).toBe(
      `<p>The output is 28<sup class="cite"><a href="#${referenceAnchor("cnn-008", 1)}" class="cite-link" aria-label="Reference 1">1</a></sup>.</p>`,
    );
  });

  it("renders grouped markers in one superscript", async () => {
    const html = await render("Both [^1][^2].");
    expect(html).toContain('aria-label="Reference 1">1</a>,<a href="#ref-cnn-008-2"');
  });

  it("leaves markers inside inline code, code blocks and math alone", async () => {
    const html = await render("Code `x[^1]` stays.\n\n```\ny = a[^2]\n```\n\nMath $a^{[^1]}$ too.");
    expect(html).not.toContain("cite-link");
    expect(html).toContain("x[^1]");
    expect(html).toContain("[^2]");
    expect(html).toContain('class="katex"');
  });

  it("works inside emphasis and does not link unknown numbers", async () => {
    const html = await render("*see [^1]* and [^7]", 1);
    expect(html).toContain('<em>see<sup class="cite"><a href="#ref-cnn-008-1"');
    expect(html).toContain('<sup class="cite">7</sup>');
  });

  it("treats a footnote with a definition as a citation and drops the definition", async () => {
    const html = await render("Claim [^1].\n\n[^1]: Ignored definition.");
    expect(html).toContain('href="#ref-cnn-008-1"');
    expect(html).not.toContain("Ignored definition");
    expect(html).not.toContain("footnote");
  });
});
