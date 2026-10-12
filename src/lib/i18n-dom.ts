/**
 * Translates the static text of a page (Astro markup) in the browser. Elements carry their key:
 *
 * - `data-i18n="<key>"` (+ `data-i18n-params='{"n":3}'`): the text content is replaced — keep
 *   such elements free of child markup (src/components/T.astro renders one span). With
 *   `data-i18n-attr="aria-label"` the attribute is translated instead; `data-i18n-suffix` is
 *   appended (the page `<title>`).
 * - `data-i18n-topic="<id>"` / `data-i18n-domain="<id>"`: a title, shown as the Vietnamese title
 *   followed by the muted English one (src/components/I18nTitle.astro).
 *
 * English text is restored from the key (and, for titles, from the text the server rendered).
 */

import { type Lang, type Params, t } from "./i18n";
import { DOMAIN_VI, TOPIC_VI } from "./i18n-titles";

function parseParams(raw: string | undefined): Params | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Params;
  } catch {
    return undefined;
  }
}

function translateText(el: HTMLElement, lang: Lang): void {
  const key = el.dataset.i18n;
  if (key === undefined) return;
  const text = t(lang, key, parseParams(el.dataset.i18nParams)) + (el.dataset.i18nSuffix ?? "");
  const attr = el.dataset.i18nAttr;
  if (attr) {
    el.setAttribute(attr, text);
    return;
  }
  if (el.textContent !== text) el.textContent = text;
  // Inside English content (lang="en", e.g. a note's reference list) say which language it is.
  if (el.parentElement?.closest("[lang]") !== document.documentElement) el.lang = lang;
}

/** "Vietnamese<span lang=en class=i18n-en> · English</span>", or the English title. */
function translateTitle(el: HTMLElement, vi: string | undefined, lang: Lang): void {
  el.dataset.en ??= el.textContent ?? "";
  const en = el.dataset.en;
  if (lang !== "vi" || !vi || vi === en) {
    if (el.textContent !== en || el.childElementCount > 0) el.textContent = en;
    return;
  }
  const secondary = document.createElement("span");
  secondary.className = "i18n-en";
  secondary.lang = "en";
  secondary.textContent = ` · ${en}`;
  el.replaceChildren(vi, secondary);
}

/** Translates every marked element under `root` (the whole document by default). */
export function translatePage(lang: Lang, root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) translateText(el, lang);
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-topic]")) {
    translateTitle(el, TOPIC_VI[el.dataset.i18nTopic ?? ""], lang);
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-domain]")) {
    translateTitle(el, DOMAIN_VI[el.dataset.i18nDomain ?? ""], lang);
  }
}
