import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { formatAttemptDate, timerAnnouncement } from "./exam";
import { answerHint, describeAccepted, NUMBER_HINT } from "./grading";
import {
  formatNumber,
  isLang,
  LANG_KEY,
  loadLang,
  msg,
  prefersVietnamese,
  saveLang,
  scopeName,
  t,
  titleOf,
  tn,
} from "./i18n";
import { keysIn, needsTranslation } from "./i18n-keys";
import { DOMAIN_VI, TOPIC_VI } from "./i18n-titles";
import { VI } from "./i18n-vi";
import { formatInterval } from "./srs";
import type { KeyValueStore } from "./storage";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const blockedStore: KeyValueStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("t", () => {
  it("returns the key, with its parameters, in English", () => {
    expect(t("en", "Check")).toBe("Check");
    expect(t("en", "Q {current} / {total}", { current: 3, total: 20 })).toBe("Q 3 / 20");
    expect(t("en", "Remove tag {tag}", { tag: "softmax" })).toBe("Remove tag softmax");
  });

  it("translates to Vietnamese and fills the same parameters", () => {
    expect(t("vi", "Check")).toBe("Kiểm tra");
    expect(t("vi", "Q {current} / {total}", { current: 3, total: 20 })).toBe("Câu 3 / 20");
  });

  it("falls back to English for a key without a translation", () => {
    expect(t("vi", "No such key {x}", { x: 1 })).toBe("No such key 1");
  });

  it("leaves unknown placeholders in place", () => {
    expect(t("en", "{a} and {b}", { a: "x" })).toBe("x and {b}");
  });

  it("formats numbers for the language", () => {
    expect(t("en", "{n} questions", { n: 7512 })).toBe("7,512 questions");
    expect(t("vi", "{n} questions", { n: 7512 })).toBe("7.512 câu hỏi");
    expect(formatNumber("vi", 1.5)).toBe("1,5");
  });

  it("shows topic and domain titles in both languages in Vietnamese", () => {
    const cnn = { topic: "cnn", en: "Convolutional Neural Networks" };
    expect(titleOf("en", cnn)).toBe("Convolutional Neural Networks");
    expect(titleOf("vi", cnn)).toBe("Mạng nơ-ron tích chập · Convolutional Neural Networks");
    expect(titleOf("vi", { domain: "dl", en: "Deep Learning" })).toBe("Học sâu · Deep Learning");
    // Same in both languages: shown once.
    expect(titleOf("vi", { topic: "pytorch", en: "PyTorch" })).toBe("PyTorch");
    // Unknown id: English.
    expect(titleOf("vi", { topic: "nope", en: "Nope" })).toBe("Nope");
    expect(t("vi", "Practice all of {title}", { title: cnn })).toBe(
      "Luyện tập toàn bộ Mạng nơ-ron tích chập · Convolutional Neural Networks",
    );
  });

  it("names what a test is about", () => {
    const topic = { kind: "topic", id: "rnn", title: "Recurrent Neural Networks" } as const;
    expect(scopeName("vi", topic)).toBe("Mạng nơ-ron hồi tiếp · Recurrent Neural Networks");
    expect(scopeName("vi", { kind: "tag", id: "softmax", title: "#softmax" })).toBe("#softmax");
    expect(scopeName("vi", { kind: "mixed", id: "custom", title: "your selection" })).toBe(
      "lựa chọn của bạn",
    );
  });

  it("marks keys with msg without changing them", () => {
    expect(msg("Check")).toBe("Check");
  });
});

describe("tn (plural keys)", () => {
  it("picks the English singular or plural key", () => {
    expect(tn("en", 1, "{n} question", "{n} questions")).toBe("1 question");
    expect(tn("en", 0, "{n} question", "{n} questions")).toBe("0 questions");
    expect(tn("en", 2, "{n} question", "{n} questions")).toBe("2 questions");
  });

  it("maps both English forms to the one Vietnamese form", () => {
    expect(tn("vi", 1, "{n} question", "{n} questions")).toBe("1 câu hỏi");
    expect(tn("vi", 5, "{n} question", "{n} questions")).toBe("5 câu hỏi");
  });

  it("passes extra parameters", () => {
    expect(
      tn("en", 1, "{n} question · {reviewed} reviewed", "{n} questions · {reviewed} reviewed", {
        reviewed: 0,
      }),
    ).toBe("1 question · 0 reviewed");
  });
});

describe("loadLang / saveLang", () => {
  it("uses the stored choice", () => {
    expect(loadLang(memoryStore({ [LANG_KEY]: "vi" }), "en-US")).toBe("vi");
    expect(loadLang(memoryStore({ [LANG_KEY]: "en" }), "vi-VN")).toBe("en");
  });

  it("falls back to the browser language", () => {
    expect(loadLang(memoryStore(), "vi-VN")).toBe("vi");
    expect(loadLang(memoryStore(), "vi")).toBe("vi");
    expect(loadLang(memoryStore(), "en-GB")).toBe("en");
    expect(loadLang(memoryStore(), "")).toBe("en");
    expect(loadLang(null, "vi")).toBe("vi");
  });

  it("ignores a stored value that is not a language", () => {
    expect(loadLang(memoryStore({ [LANG_KEY]: "fr" }), "en")).toBe("en");
    expect(loadLang(memoryStore({ [LANG_KEY]: '"vi"' }), "en")).toBe("en");
  });

  it("works with blocked storage", () => {
    expect(loadLang(blockedStore, "vi-VN")).toBe("vi");
    expect(loadLang(blockedStore, "en")).toBe("en");
    expect(saveLang("vi", blockedStore)).toBe(false);
    expect(saveLang("vi", null)).toBe(false);
  });

  it("stores the choice", () => {
    const store = memoryStore();
    expect(saveLang("vi", store)).toBe(true);
    expect(store.getItem(LANG_KEY)).toBe("vi");
    expect(loadLang(store, "en")).toBe("vi");
  });

  it("recognises Vietnamese browser languages only", () => {
    expect(prefersVietnamese("vi-VN")).toBe(true);
    expect(prefersVietnamese("VI")).toBe(true);
    expect(prefersVietnamese("vie")).toBe(false);
    expect(isLang("vi") && isLang("en") && !isLang("de")).toBe(true);
  });
});

describe("messages of the pure logic", () => {
  it("are English by default and Vietnamese on request", () => {
    expect(answerHint({ accept: [], numeric: 3 })).toBe(NUMBER_HINT);
    expect(answerHint({ accept: [], numeric: 3 }, "vi")).toBe(
      "Nhập một số, ví dụ 42, -0.5, 1/3 hoặc 2.5e-3.",
    );
    expect(answerHint({ accept: ["x"], hint: "one word" }, "vi")).toBe("one word"); // content
    expect(describeAccepted({ accept: ["a"], pattern: "a+" }, "vi")).toBe(
      "a (và các cách viết tương đương)",
    );
    expect(timerAnnouncement(6 * 60_000, 5 * 60_000, "vi")).toBe("Còn 5 phút.");
    expect(timerAnnouncement(2 * 60_000, 30_000, "vi")).toBe("Còn 30 giây.");
    expect(formatInterval(1, "vi")).toBe("1 ngày");
    expect(formatInterval(548, "vi")).toBe("1,5 năm");
    expect(formatAttemptDate(Date.UTC(2026, 9, 10, 12), "vi")).toMatch(/2026/);
    expect(formatAttemptDate(Date.UTC(2026, 9, 10, 12), "en")).toMatch(/Oct 2026/);
  });
});

// --------------------------------------------------------------------------- key check

const SRC = "src"; // vitest runs from the repository root
/** Not scanned: tests (made-up keys), the dictionary itself and the scanner. */
const SKIP = /\.test\.ts$|[\\/]i18n-vi\.ts$|[\\/]i18n-keys\.ts$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "content" ? [] : sourceFiles(path);
    return /\.(ts|tsx|astro)$/.test(entry.name) && !SKIP.test(path) ? [path] : [];
  });
}

/** Key → the files that use it. */
function usedKeys(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  for (const file of sourceFiles(SRC)) {
    for (const key of keysIn(readFileSync(file, "utf8"), file.endsWith(".astro"))) {
      used.set(key, [...(used.get(key) ?? []), relative(SRC, file)]);
    }
  }
  return used;
}

const placeholders = (text: string) => [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();

describe("translation keys", () => {
  const used = usedKeys();

  it("finds keys in calls and in Astro markup", () => {
    expect(
      keysIn(
        't("Check"); t.n(n, "{n} day", "{n} days"); t(lang, cond ? "a" : "b"); msg("Hi {x}");' +
          ' t("en", key); tn(lang, n, "{n} test", "{n} tests"); t.rich("See {a}.", { a: x })',
        false,
      ),
    ).toEqual(["Check", "{n} day", "{n} days", "Hi {x}", "{n} test", "{n} tests", "See {a}."]);
    expect(
      keysIn(
        '<T k="Topics" /> <T\n  k="{n} questions"\n  one="{n} question"\n  n={3}\n/>' +
          ' <nav data-i18n="Main" data-i18n-attr="aria-label"> <Base titleKey="Glossary">',
        true,
      ),
    ).toEqual(["Main", "Glossary", "Topics", "{n} questions", "{n} question"]);
  });

  it("scans the interface code", () => {
    expect(used.size).toBeGreaterThan(300);
    expect(used.has("Check")).toBe(true); // Quiz.tsx
    expect(used.has("Skip to content")).toBe(true); // Base.astro
  });

  it("has a Vietnamese translation for every key", () => {
    const missing = [...used.keys()].filter((key) => needsTranslation(key) && !(key in VI));
    expect(missing.map((key) => `${key}  (${used.get(key)?.join(", ")})`)).toEqual([]);
  });

  it("uses every Vietnamese translation (no dead keys)", () => {
    expect(Object.keys(VI).filter((key) => !used.has(key))).toEqual([]);
  });

  it("keeps the placeholders of each key", () => {
    const changed = Object.entries(VI).filter(
      ([key, vi]) => placeholders(key).join() !== placeholders(vi).join(),
    );
    expect(changed).toEqual([]);
  });
});

describe("taxonomy titles", () => {
  const taxonomy = parse(readFileSync(join(SRC, "content/taxonomy.yaml"), "utf8")) as {
    domains: Array<{ id: string; topics: Array<{ id: string }> }>;
  };
  const domains = taxonomy.domains.map((d) => d.id);
  const topics = taxonomy.domains.flatMap((d) => d.topics.map((topic) => topic.id));

  it("has a Vietnamese title for every domain and topic", () => {
    expect(domains.filter((id) => !DOMAIN_VI[id]?.trim())).toEqual([]);
    expect(topics.filter((id) => !TOPIC_VI[id]?.trim())).toEqual([]);
    expect(topics.length).toBeGreaterThanOrEqual(54);
  });

  it("has no titles for ids outside the taxonomy", () => {
    expect(Object.keys(DOMAIN_VI).filter((id) => !domains.includes(id))).toEqual([]);
    expect(Object.keys(TOPIC_VI).filter((id) => !topics.includes(id))).toEqual([]);
  });
});
