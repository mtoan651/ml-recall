/**
 * "answered / total" bars on cards that list question ids (home page, CE6146 page): an element
 * `[data-topic-progress]` with `data-ids`, a `[data-bar]` and a `[data-label]` inside, hidden
 * until this browser has answered one of its questions.
 */
import { currentLang, LANG_EVENT, t } from "./i18n";
import { loadResults, summarize } from "./storage";

function showProgress(): void {
  const results = loadResults();
  const lang = currentLang();
  for (const el of document.querySelectorAll<HTMLElement>("[data-topic-progress]")) {
    const ids = (el.dataset.ids ?? "").split(" ").filter(Boolean);
    const { answered, correct } = summarize(results, ids);
    if (answered === 0) continue;
    const label = el.querySelector<HTMLElement>("[data-label]");
    const bar = el.querySelector<HTMLElement>("[data-bar]");
    if (label) {
      label.textContent = t(lang, "{answered} / {total} answered · {correct} correct", {
        answered,
        total: ids.length,
        correct,
      });
    }
    if (bar) bar.style.width = `${Math.round((answered / ids.length) * 100)}%`;
    el.classList.replace("hidden", "flex");
  }
}

export function initTopicProgress(): void {
  showProgress();
  window.addEventListener(LANG_EVENT, showProgress);
}
