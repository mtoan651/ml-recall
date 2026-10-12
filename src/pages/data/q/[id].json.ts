/**
 * One rendered question as JSON (`QuizQuestion`, the same props the quiz islands get), at
 * `data/q/<id>.json`. Mixed tests and My mistakes fetch only the questions they show
 * (src/lib/fetch.ts) instead of embedding the whole bank.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { type BankQuestion, getBank, toQuizQuestion } from "../../../lib/bank";

export const getStaticPaths = (async () => {
  const bank = await getBank();
  return bank.questions.map((bq) => ({ params: { id: bq.question.id }, props: { bq } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ bq: BankQuestion }> = async ({ props }) => {
  const question = await toQuizQuestion(props.bq, await getBank());
  return new Response(JSON.stringify(question), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
