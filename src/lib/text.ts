const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Sigma: "Σ",
  Phi: "Φ",
  Omega: "Ω",
};
const SYMBOL: Record<string, string> = {
  cdot: "·",
  times: "×",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  infty: "∞",
  sum: "Σ",
  prod: "Π",
  partial: "∂",
  nabla: "∇",
  in: "∈",
  to: "→",
  rightarrow: "→",
  log: "log",
  exp: "exp",
  max: "max",
  min: "min",
  ldots: "…",
  dots: "…",
  top: "ᵀ",
};

/** TeX inside `$…$` as readable text: `\frac{a}{b}` → a/b, `\sigma` → σ, `\mathbf{x}` → x. */
export function texToText(tex: string): string {
  let t = tex;
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(
        /\\(?:mathbf|mathrm|mathit|mathcal|boldsymbol|text|textbf|operatorname|bm)\s*\{([^{}]*)\}/g,
        "$1",
      )
      .replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√$1");
  }
  return t
    .replace(/\\(left|right|big|Big|bigg|Bigg)\b/g, "")
    .replace(/\\([A-Za-z]+)/g, (_, name: string) => GREEK[name] ?? SYMBOL[name] ?? name)
    .replace(/\\[,;:! ]/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Plain text from question Markdown, for page titles, meta descriptions and search-result
 * titles: code, math, links, emphasis and citation markers reduced to readable text.
 */
export function plainText(markdown: string, max = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " (code) ")
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, tex: string) => ` ${texToText(tex)} `)
    .replace(/\$([^$\n]+)\$/g, (_, tex: string) => texToText(tex))
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\{\{\d+\}\}/g, "___")
    .replace(/\[\^\d+\]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/\\([\\<>$_*`[\]#])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}
