/**
 * Finds the translation keys used in source code, for the key check in i18n.test.ts (Node only,
 * never bundled). Keys are string literals in:
 *
 * - calls `t(…)`, `tn(…)`, `t.n(…)`, `t.rich(…)` and `msg(…)`: every argument that is just a
 *   string literal (a key passed in a variable must come from `msg("…")`);
 * - Astro markup: `data-i18n="…"`, `<T k="…" one="…">` and `titleKey="…"` (on `<Base>`).
 */

const CALL = /(?<![\w.$])(?:t\.n|t\.rich|tn|t|msg)\(/g;

/** The string literal starting at `text[start]` and the index after it, or null. */
function readString(text: string, start: number): { value: string; end: number } | null {
  const quote = text[start];
  if (quote !== '"' && quote !== "'") return null;
  let value = "";
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      const next = text[i + 1] ?? "";
      value += next === "n" ? "\n" : next;
      i++;
    } else if (c === quote) {
      return { value, end: i + 1 };
    } else {
      value += c;
    }
  }
  return null;
}

/** The raw text of each argument of the call whose `(` is at `open`. */
function callArguments(text: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i] ?? "";
    if (c === '"' || c === "'") {
      const str = readString(text, i);
      if (!str) return args;
      i = str.end - 1;
    } else if (c === "`") {
      const close = text.indexOf("`", i + 1);
      if (close < 0) return args;
      i = close;
    } else if (c === "(" || c === "[" || c === "{") {
      depth++;
    } else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) {
        args.push(text.slice(start, i));
        return args;
      }
      depth--;
    } else if (c === "," && depth === 0) {
      args.push(text.slice(start, i));
      start = i + 1;
    }
  }
  return args;
}

/** Every key used in one source file (`astro`: also read the markup attributes). */
export function keysIn(source: string, astro: boolean): string[] {
  const keys: string[] = [];
  for (const match of source.matchAll(CALL)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    callArguments(source, open).forEach((arg, i) => {
      const text = arg.trim();
      const str = readString(text, 0);
      if (!str || str.end !== text.length) return;
      // `t("en", key)`: the first argument of t / tn may be the language.
      const lang = i === 0 && (match[0] === "t(" || match[0] === "tn(");
      if (!(lang && (str.value === "en" || str.value === "vi"))) keys.push(str.value);
    });
  }
  if (astro) {
    for (const m of source.matchAll(/\bdata-i18n="([^"]*)"/g)) keys.push(m[1] ?? "");
    for (const m of source.matchAll(/\btitleKey="([^"]*)"/g)) keys.push(m[1] ?? "");
    for (const tag of source.matchAll(/<T\s[^>]*?\/?>/g)) {
      for (const m of tag[0].matchAll(/\b(?:k|one)="([^"]*)"/g)) keys.push(m[1] ?? "");
    }
  }
  return keys;
}

/** Keys made only of placeholders, digits and punctuation ("{title}") need no translation. */
export const needsTranslation = (key: string): boolean =>
  /\p{L}/u.test(key.replace(/\{\w+\}/g, ""));
