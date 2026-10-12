/**
 * The interface language in React islands. The server and the hydration render use English
 * (the server cannot know the choice, and the first client render must match its HTML); right
 * after hydration `useSyncExternalStore` switches to the page's language and follows the
 * `ml-recall:lang` event — a re-render, so state such as a test in progress survives a switch.
 * Until an island shows the page's language it stays hidden (`.quiz[data-lang]` in global.css).
 */
import { createElement, Fragment, type ReactNode, useSyncExternalStore } from "react";
import {
  currentLang,
  formatNumber,
  LANG_EVENT,
  type Lang,
  type Param,
  type Params,
  type TitleRef,
  t,
  titleOf,
  tn,
} from "./i18n";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(LANG_EVENT, onChange);
  return () => window.removeEventListener(LANG_EVENT, onChange);
}

const serverLang = (): Lang => "en";

/** "en" on the server and while hydrating, then the page's language. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, currentLang, serverLang);
}

/** `t` bound to one language, with helpers. Stable per language (safe in dependency lists). */
export interface Translator {
  (key: string, params?: Params): string;
  lang: Lang;
  /** Plural: `one` when count is 1, else `other`, with `{n}` = count. */
  n(count: number, one: string, other: string, params?: Params): string;
  /** Like `t`, but parameters may be React nodes (links, emphasis) placed into the text. */
  rich(key: string, params: Readonly<Record<string, Param | ReactNode>>): ReactNode;
  /** A topic or domain title as text ("Vietnamese · English" in Vietnamese). */
  title(ref: TitleRef): string;
  /** A number formatted for the language. */
  num(n: number): string;
}

const isParam = (value: unknown): value is Param =>
  typeof value === "string" ||
  typeof value === "number" ||
  (typeof value === "object" &&
    value !== null &&
    ("topic" in value || "domain" in value) &&
    "en" in value);

function makeTranslator(lang: Lang): Translator {
  const translate = ((key: string, params?: Params) => t(lang, key, params)) as Translator;
  translate.lang = lang;
  translate.n = (count, one, other, params) => tn(lang, count, one, other, params);
  translate.title = (ref) => titleOf(lang, ref);
  translate.num = (n) => formatNumber(lang, n);
  translate.rich = (key, params) => {
    // Text parameters are filled in first; node parameters split the text around them.
    const text = t(
      lang,
      key,
      Object.fromEntries(
        Object.entries(params).filter((entry): entry is [string, Param] => isParam(entry[1])),
      ),
    );
    const parts = text.split(/(\{\w+\})/);
    return parts.map((part, i) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      const node = name === undefined ? part : params[name];
      return createElement(Fragment, { key: i }, name === undefined ? part : (node as ReactNode));
    });
  };
  return translate;
}

const TRANSLATORS: Record<Lang, Translator> = {
  en: makeTranslator("en"),
  vi: makeTranslator("vi"),
};

/** The translator of a language (outside React, e.g. in event handlers given a language). */
export const translator = (lang: Lang): Translator => TRANSLATORS[lang];

/** The translator for the island's current language. */
export function useT(): Translator {
  return TRANSLATORS[useLang()];
}
