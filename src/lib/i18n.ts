/**
 * Interface language: English (default) or Vietnamese (docs/web-app.md#vietnamese-interface).
 * Only the interface is translated — questions, notes and explanations stay in English.
 *
 * A translation key is the English text itself, with `{name}` placeholders: `t("en", key)` is
 * the key with its parameters filled in, `t("vi", key)` looks it up in `VI` (src/lib/i18n-vi.ts)
 * and falls back to English. English plurals are separate keys ("{n} question" / "{n}
 * questions", picked by `tn`) that may share one Vietnamese form. Keys must be string literals
 * in `t(…)`, `tn(…)`, `msg(…)` and `data-i18n="…"` so that `i18n.test.ts` can check that every
 * key has a translation and every translation is used.
 */
import { DOMAIN_VI, TOPIC_VI } from "./i18n-titles";
import { VI } from "./i18n-vi";
import type { KeyValueStore } from "./storage";

export type Lang = "en" | "vi";
export const LANGS: readonly Lang[] = ["en", "vi"];
/** The chosen language, a plain string (read by the inline script in Base.astro too). */
export const LANG_KEY = "ml-recall:lang:v1";
/** Window event fired after the language changes (detail: the new language). */
export const LANG_EVENT = "ml-recall:lang";

export const isLang = (value: unknown): value is Lang => value === "en" || value === "vi";

/** A topic or domain title as a parameter: "Vietnamese · English" in Vietnamese. */
export type TitleRef = { topic: string; en: string } | { domain: string; en: string };
export type Param = string | number | TitleRef;
export type Params = Readonly<Record<string, Param>>;

/** Marks a key defined away from its `t` call (a constant, a table) for the key check. */
export const msg = (key: string): string => key;

const NUMBERS: Record<Lang, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en"),
  vi: new Intl.NumberFormat("vi"),
};

/** 1,234.5 in English, 1.234,5 in Vietnamese. */
export const formatNumber = (lang: Lang, n: number): string => NUMBERS[lang].format(n);

/** The Vietnamese title of a topic or domain, if there is one. */
export function viTitle(ref: TitleRef): string | undefined {
  return "topic" in ref ? TOPIC_VI[ref.topic] : DOMAIN_VI[ref.domain];
}

/** A topic or domain title as text: "Mạng nơ-ron tích chập · Convolutional Neural Networks". */
export function titleOf(lang: Lang, ref: TitleRef): string {
  const vi = lang === "vi" ? viTitle(ref) : undefined;
  return vi && vi !== ref.en ? `${vi} · ${ref.en}` : ref.en;
}

function paramText(lang: Lang, value: Param): string {
  if (typeof value === "number") return formatNumber(lang, value);
  if (typeof value === "string") return value;
  return titleOf(lang, value);
}

/** Fills `{name}` placeholders; unknown names stay as they are. */
export function fill(template: string, render: (name: string) => string | undefined): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => render(name) ?? whole);
}

/** The text of `key` in `lang`, with its parameters (numbers formatted for the language). */
export function t(lang: Lang, key: string, params?: Params): string {
  const template = lang === "vi" ? (VI[key] ?? key) : key;
  if (!params) return template;
  return fill(template, (name) => {
    const value = params[name];
    return value === undefined ? undefined : paramText(lang, value);
  });
}

/** `one` when `count` is 1, else `other`, with `{n}` = count. */
export function tn(lang: Lang, count: number, one: string, other: string, params?: Params): string {
  return t(lang, count === 1 ? one : other, { n: count, ...params });
}

/** What a test is about, for sentences: the topic title, "#tag", or the mixed test's key. */
export function scopeName(
  lang: Lang,
  scope: { kind: "topic" | "tag" | "mixed"; id: string; title: string },
): string {
  if (scope.kind === "topic") return titleOf(lang, { topic: scope.id, en: scope.title });
  return scope.kind === "mixed" ? t(lang, scope.title) : scope.title;
}

// --------------------------------------------------------------------------- choice

function browserStore(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function browserLanguage(): string {
  return typeof navigator === "undefined" ? "" : (navigator.language ?? "");
}

/** Same rule as the inline script in Base.astro: "vi", "vi-VN"… → Vietnamese. */
export const prefersVietnamese = (language: string): boolean => /^vi\b/i.test(language);

/** The stored choice, else Vietnamese for a browser set to Vietnamese, else English. */
export function loadLang(
  store: KeyValueStore | null = browserStore(),
  language: string = browserLanguage(),
): Lang {
  let stored: string | null = null;
  try {
    stored = store?.getItem(LANG_KEY) ?? null;
  } catch {
    // blocked storage: fall back to the browser language
  }
  if (isLang(stored)) return stored;
  return prefersVietnamese(language) ? "vi" : "en";
}

/**
 * Remembers the choice and, in the browser, applies it: `<html lang data-lang>` and the
 * `ml-recall:lang` event, on which pages and islands re-render. False when it was not stored.
 */
export function saveLang(lang: Lang, store: KeyValueStore | null = browserStore()): boolean {
  let saved = false;
  try {
    store?.setItem(LANG_KEY, lang);
    saved = store !== null;
  } catch {
    // full or blocked storage: the choice lasts for this page only
  }
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const changed = root.dataset.lang !== lang;
    root.dataset.lang = lang;
    root.lang = lang;
    if (changed) window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
  }
  return saved;
}

/** The language of this page: set before the first paint by the inline script in Base.astro. */
export function currentLang(): Lang {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.dataset.lang;
  return isLang(lang) ? lang : loadLang();
}
