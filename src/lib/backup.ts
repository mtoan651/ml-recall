/**
 * Back up and restore progress: one JSON file with every stored key except tests in progress
 * (they are tied to a running clock). Importing **merges** into this browser instead of
 * replacing it, so restoring an old file never loses newer work:
 *
 * - results and spaced-repetition cards: per question, the more recent one wins;
 * - test histories: per scope, the union of attempts (the latest 10 kept) and the best of both;
 * - settings and mixed-test choices: taken from the file only when this browser has none.
 */
import {
  EXAM_HISTORY_LIMIT,
  type ExamAttempt,
  type ExamHistory,
  isBetterAttempt,
  parseHistory,
} from "./exam";
import { msg } from "./i18n";
import { SRS_EVENT, SRS_KEY } from "./srs-due";
import {
  EXAM_HISTORY_KEY,
  type KeyValueStore,
  MIXED_KEY,
  RESULTS_KEY,
  SETTINGS_KEY,
} from "./storage";

export const BACKUP_APP = "ml-recall";
export const BACKUP_FORMAT = 1;
/** Keys written to a backup, in this order. */
export const BACKUP_KEYS = [RESULTS_KEY, SRS_KEY, EXAM_HISTORY_KEY, SETTINGS_KEY, MIXED_KEY];

export interface Backup {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  /** ISO time of the export. */
  exportedAt: string;
  /** Storage key → its parsed value. */
  data: Record<string, unknown>;
}

export interface MergeSummary {
  /** Question results added or replaced by newer ones. */
  results: number;
  /** Spaced-repetition cards added or replaced by more recently reviewed ones. */
  cards: number;
  /** Test attempts added to the histories. */
  tests: number;
  /** Settings or mixed-test choices taken from the file. */
  preferences: number;
}

export class BackupError extends Error {}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function read(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function write(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    throw new BackupError(
      msg("This browser's storage is full or blocked, so nothing more was saved."),
    );
  }
}

/** Everything this browser has stored, as a backup. */
export function createBackup(store: KeyValueStore | null, now: number = Date.now()): Backup {
  const data: Record<string, unknown> = {};
  if (store) {
    for (const key of BACKUP_KEYS) {
      const value = read(store, key);
      if (value !== undefined) data[key] = value;
    }
  }
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date(now).toISOString(), data };
}

/** `ml-recall-progress-2026-10-12.json` (local date). */
export function backupFileName(now: number = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `ml-recall-progress-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Reads a backup file's text; throws `BackupError` with a message for the learner. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError(msg("That file is not JSON — choose a file exported from this page."));
  }
  if (!isRecord(data) || data.app !== BACKUP_APP || !isRecord(data.data)) {
    throw new BackupError(msg("That file is not an ml-recall progress file."));
  }
  if (data.format !== BACKUP_FORMAT) {
    throw new BackupError(msg("That progress file comes from a newer version of the site."));
  }
  const exportedAt = typeof data.exportedAt === "string" ? data.exportedAt : "";
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt, data: data.data };
}

const isResult = (v: unknown): v is { correct: boolean; at: number } =>
  isRecord(v) &&
  typeof v.correct === "boolean" &&
  typeof v.at === "number" &&
  Number.isFinite(v.at);

const isCard = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === 8 && v.every((n) => typeof n === "number" && Number.isFinite(n));

/** Newer entry per id (`stamp` gives an entry's time); returns how many came from `incoming`. */
function mergeById<T>(
  local: unknown,
  incoming: unknown,
  valid: (v: unknown) => v is T,
  stamp: (v: T) => number,
): { merged: Record<string, T>; taken: number } {
  const merged: Record<string, T> = {};
  if (isRecord(local)) for (const [id, v] of Object.entries(local)) if (valid(v)) merged[id] = v;
  let taken = 0;
  if (isRecord(incoming)) {
    for (const [id, v] of Object.entries(incoming)) {
      if (!valid(v)) continue;
      const current = merged[id];
      if (current === undefined || stamp(v) > stamp(current)) {
        merged[id] = v;
        taken++;
      }
    }
  }
  return { merged, taken };
}

const sameAttempt = (a: ExamAttempt, b: ExamAttempt) =>
  a.at === b.at && a.correct === b.correct && a.total === b.total;

/** Union of two histories: attempts by time (latest `EXAM_HISTORY_LIMIT`), the better best. */
export function mergeHistories(local: ExamHistory, incoming: ExamHistory): ExamHistory {
  const attempts = [...local.attempts];
  for (const a of incoming.attempts) if (!attempts.some((b) => sameAttempt(a, b))) attempts.push(a);
  attempts.sort((a, b) => a.at - b.at);
  let best = local.best;
  for (const candidate of [incoming.best, ...attempts]) {
    if (candidate && isBetterAttempt(candidate, best)) best = candidate;
  }
  const kept = attempts.slice(-EXAM_HISTORY_LIMIT);
  return best ? { attempts: kept, best } : { attempts: kept };
}

/** Merges `backup` into `store` (see the module comment) and says what changed. */
export function mergeBackup(backup: Backup, store: KeyValueStore | null): MergeSummary {
  if (!store)
    throw new BackupError(msg("This browser blocks storage, so progress can't be saved."));
  const summary: MergeSummary = { results: 0, cards: 0, tests: 0, preferences: 0 };
  const data = backup.data;

  if (RESULTS_KEY in data) {
    const { merged, taken } = mergeById(
      read(store, RESULTS_KEY),
      data[RESULTS_KEY],
      isResult,
      (r) => r.at,
    );
    if (taken > 0) write(store, RESULTS_KEY, merged);
    summary.results = taken;
  }
  if (SRS_KEY in data) {
    // A card's last field is its last review time.
    const { merged, taken } = mergeById(
      read(store, SRS_KEY),
      data[SRS_KEY],
      isCard,
      (c) => c[7] ?? 0,
    );
    if (taken > 0) write(store, SRS_KEY, merged);
    summary.cards = taken;
  }
  if (isRecord(data[EXAM_HISTORY_KEY])) {
    const localAll = read(store, EXAM_HISTORY_KEY);
    const all: Json = isRecord(localAll) ? { ...localAll } : {};
    for (const [scope, raw] of Object.entries(data[EXAM_HISTORY_KEY] as Json)) {
      const incoming = parseHistory(raw);
      if (incoming.attempts.length === 0 && !incoming.best) continue;
      const local = parseHistory(all[scope]);
      const merged = mergeHistories(local, incoming);
      const added = merged.attempts.filter((a) => !local.attempts.some((b) => sameAttempt(a, b)));
      summary.tests += added.length;
      all[scope] = merged;
    }
    write(store, EXAM_HISTORY_KEY, all);
  }
  for (const key of [SETTINGS_KEY, MIXED_KEY]) {
    if (isRecord(data[key]) && read(store, key) === undefined) {
      write(store, key, data[key]);
      summary.preferences++;
    }
  }
  if (summary.cards > 0 && typeof window !== "undefined")
    window.dispatchEvent(new Event(SRS_EVENT));
  return summary;
}
