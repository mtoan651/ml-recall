import { describe, expect, it } from "vitest";
import { plainText } from "./text";

describe("plainText", () => {
  it("reduces Markdown to readable text", () => {
    expect(plainText("What does `np.zeros(3)` return?")).toBe("What does np.zeros(3) return?");
    expect(plainText("If $x = 2$, what is **$x^2$**?[^1]")).toBe("If x = 2, what is x^2?");
    expect(plainText("Fill in: the {{1}} of a *sigmoid* is \\<1.")).toBe(
      "Fill in: the ___ of a sigmoid is <1.",
    );
    expect(plainText("See [d2l](https://d2l.ai) now")).toBe("See d2l now");
    expect(plainText("What prints?\n\n```python\nprint(1)\n```")).toBe("What prints? (code)");
    expect(plainText("snake_case_name stays")).toBe("snake_case_name stays");
  });

  it("turns common TeX into text", () => {
    expect(plainText("Logits $\\mathbf{o} = (2, 1, 0)$ and $\\sigma(x)$")).toBe(
      "Logits o = (2, 1, 0) and σ(x)",
    );
    expect(plainText("Compute $\\frac{a}{b} \\cdot \\sqrt{n}$")).toBe("Compute a/b · √n");
    expect(plainText("$\\left( x_{i} \\right)^{2}$")).toBe("( x_i )^2");
  });

  it("cuts long text at a word", () => {
    const long = "word ".repeat(50);
    const cut = plainText(long, 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith("word…")).toBe(true);
  });
});
