import { describe, expect, it } from "vitest";
import {
  answerOf,
  createSession,
  currentItem,
  missedIds,
  type Session,
  type SessionAction,
  score,
  sessionReducer,
} from "./session";
import { mulberry32 } from "./shuffle";

const questions = [
  { id: "a-001", shuffleOptions: true, optionCount: 4 },
  { id: "a-002", shuffleOptions: false, optionCount: 3 },
  { id: "a-003", shuffleOptions: true, optionCount: 0 },
];

const run = (session: Session, ...actions: SessionAction[]) =>
  actions.reduce(sessionReducer, session);

describe("createSession", () => {
  it("keeps file order for the server render", () => {
    const s = createSession(questions, { shuffleQuestions: false, shuffleOptions: false });
    expect(s.items.map((i) => i.id)).toEqual(["a-001", "a-002", "a-003"]);
    expect(s.items[0]?.optionOrder).toEqual([0, 1, 2, 3]);
  });

  it("shuffles questions and options but respects fixed option order", () => {
    const s = createSession(questions, {
      shuffleQuestions: true,
      shuffleOptions: true,
      rng: mulberry32(5),
    });
    expect(s.items.map((i) => i.id).sort()).toEqual(["a-001", "a-002", "a-003"]);
    const fixed = s.items.find((i) => i.id === "a-002");
    expect(fixed?.optionOrder).toEqual([0, 1, 2]);
    const shuffledItem = s.items.find((i) => i.id === "a-001");
    expect([...(shuffledItem?.optionOrder ?? [])].sort()).toEqual([0, 1, 2, 3]);
  });

  it("is finished right away when empty", () => {
    expect(createSession([], { shuffleQuestions: true, shuffleOptions: true }).finished).toBe(true);
  });
});

describe("sessionReducer", () => {
  const fresh = () => createSession(questions, { shuffleQuestions: false, shuffleOptions: false });

  it("selects one option for single choice and toggles for multiple", () => {
    let s = run(fresh(), { type: "select", option: 2, multiple: false });
    s = run(s, { type: "select", option: 1, multiple: false });
    expect(answerOf(s, "a-001").selected).toEqual([1]);

    s = run(
      fresh(),
      { type: "select", option: 3, multiple: true },
      { type: "select", option: 0, multiple: true },
      { type: "select", option: 3, multiple: true },
    );
    expect(answerOf(s, "a-001").selected).toEqual([0]);
  });

  it("does not move on before the answer is graded, and freezes graded answers", () => {
    let s = run(fresh(), { type: "select", option: 0, multiple: false }, { type: "next" });
    expect(s.position).toBe(0);
    s = run(
      s,
      { type: "grade", outcome: "correct" },
      { type: "select", option: 2, multiple: false },
    );
    expect(answerOf(s, "a-001")).toMatchObject({ selected: [0], outcome: "correct" });
    s = run(s, { type: "grade", outcome: "incorrect" });
    expect(answerOf(s, "a-001").outcome).toBe("correct");
    s = run(s, { type: "next" });
    expect(currentItem(s)?.id).toBe("a-002");
  });

  it("keeps score, finishes after the last question and lists missed ones", () => {
    const s = run(
      fresh(),
      { type: "select", option: 0, multiple: false },
      { type: "grade", outcome: "correct" },
      { type: "next" },
      { type: "select", option: 1, multiple: false },
      { type: "grade", outcome: "incorrect" },
      { type: "next" },
      { type: "type", text: "my answer" },
      { type: "reveal" },
      { type: "grade", outcome: "correct" },
    );
    expect(score(s)).toEqual({ current: 3, total: 3, answered: 3, correct: 2 });
    expect(answerOf(s, "a-003")).toMatchObject({ text: "my answer", revealed: true });

    const done = run(s, { type: "next" });
    expect(done.finished).toBe(true);
    expect(currentItem(done)).toBeUndefined();
    expect(score(done).current).toBe(3);
    expect(missedIds(done)).toEqual(["a-002"]);
  });

  it("restarts with a new session", () => {
    const other = createSession(questions.slice(0, 1), {
      shuffleQuestions: false,
      shuffleOptions: false,
    });
    expect(run(fresh(), { type: "restart", session: other })).toBe(other);
  });
});
