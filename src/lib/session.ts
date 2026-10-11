/**
 * A practice session: the order of questions and options, the learner's answers and the
 * score. Pure state + reducer so the React island only renders and dispatches.
 */
import { order, type Rng } from "./shuffle";

export type Outcome = "correct" | "incorrect";

/** What the session needs to know about a question. */
export interface SessionInput {
  id: string;
  /** False when options keep file order (`shuffle: false`, true/false questions). */
  shuffleOptions: boolean;
  /** Number of options (0 for short answers). */
  optionCount: number;
}

export interface SessionItem {
  id: string;
  /** Display order: `optionOrder[k]` is the original index of the k-th option shown. */
  optionOrder: number[];
}

export interface Answer {
  /** Selected options, as original option indexes. */
  selected: number[];
  /** Typed short answer. */
  text: string;
  /** Self-graded short answer: the model answer has been revealed. */
  revealed: boolean;
  /** Set once the answer has been graded. */
  outcome?: Outcome;
}

export interface Session {
  items: SessionItem[];
  /** Index into `items` of the current question. */
  position: number;
  answers: Record<string, Answer>;
  finished: boolean;
}

export interface SessionOptions {
  shuffleQuestions: boolean;
  /** False for the deterministic server render; options are shuffled once in the browser. */
  shuffleOptions: boolean;
  rng?: Rng;
}

export function createSession(
  questions: readonly SessionInput[],
  options: SessionOptions,
): Session {
  const rng = options.rng ?? Math.random;
  const items = order(questions.length, options.shuffleQuestions, rng).map((i) => {
    const q = questions[i] as SessionInput;
    return {
      id: q.id,
      optionOrder: order(q.optionCount, options.shuffleOptions && q.shuffleOptions, rng),
    };
  });
  return { items, position: 0, answers: {}, finished: items.length === 0 };
}

export const EMPTY_ANSWER: Answer = { selected: [], text: "", revealed: false };

export function currentItem(session: Session): SessionItem | undefined {
  return session.finished ? undefined : session.items[session.position];
}

export function answerOf(session: Session, id: string): Answer {
  return session.answers[id] ?? EMPTY_ANSWER;
}

export type SessionAction =
  /** Select an option (original index); toggles for "select all that apply". */
  | { type: "select"; option: number; multiple: boolean }
  | { type: "type"; text: string }
  | { type: "reveal" }
  | { type: "grade"; outcome: Outcome }
  | { type: "next" }
  | { type: "restart"; session: Session };

function updateCurrent(session: Session, update: (answer: Answer) => Answer | null): Session {
  const item = currentItem(session);
  if (!item) return session;
  const answer = answerOf(session, item.id);
  if (answer.outcome) return session; // graded answers are final
  const next = update(answer);
  return next ? { ...session, answers: { ...session.answers, [item.id]: next } } : session;
}

/**
 * The selection after picking `option` (an original index): replaces it for single choice,
 * toggles it for "select all that apply". The result is sorted.
 */
export function toggleOption(selected: readonly number[], option: number, multiple: boolean) {
  if (!multiple) return [option];
  return selected.includes(option)
    ? selected.filter((o) => o !== option)
    : [...selected, option].sort((x, y) => x - y);
}

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case "select":
      return updateCurrent(session, (a) => ({
        ...a,
        selected: toggleOption(a.selected, action.option, action.multiple),
      }));
    case "type":
      return updateCurrent(session, (a) => ({ ...a, text: action.text }));
    case "reveal":
      return updateCurrent(session, (a) => ({ ...a, revealed: true }));
    case "grade":
      return updateCurrent(session, (a) => ({ ...a, outcome: action.outcome }));
    case "next": {
      const item = currentItem(session);
      if (!item || !answerOf(session, item.id).outcome) return session;
      const position = session.position + 1;
      return position >= session.items.length
        ? { ...session, finished: true }
        : { ...session, position };
    }
    case "restart":
      return action.session;
  }
}

export interface Score {
  /** 1-based number of the current question (= total when finished). */
  current: number;
  total: number;
  answered: number;
  correct: number;
}

export function score(session: Session): Score {
  let answered = 0;
  let correct = 0;
  for (const { id } of session.items) {
    const outcome = session.answers[id]?.outcome;
    if (!outcome) continue;
    answered++;
    if (outcome === "correct") correct++;
  }
  const total = session.items.length;
  const current = session.finished ? total : Math.min(session.position + 1, total);
  return { current, total, answered, correct };
}

/** Ids answered incorrectly, in session order. */
export function missedIds(session: Session): string[] {
  return session.items
    .filter(({ id }) => session.answers[id]?.outcome === "incorrect")
    .map(({ id }) => id);
}
