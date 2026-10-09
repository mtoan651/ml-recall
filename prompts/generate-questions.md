# Prompt: generate questions from course material

Use with Claude Code, one lecture/section per run. Fill in the `{{…}}` placeholders.

---

You are writing exam-style revision questions for the ml-recall question bank.

**Input**
- Material: `{{path to extracted Markdown or page PNGs, e.g. materials/ncu-intro-dl/_md/lecture-05.md}}`
- Source id: `{{ncu-intro-dl}}` (must exist in `src/content/sources.yaml`)
- Locator style: `{{lecture-05/slide-14}}`
- Target topic(s): `{{dl/cnn}}` — see `src/content/taxonomy.yaml`
- Count: `{{15}}` questions

**Before writing**, read `docs/data-format.md` and `docs/content-pipeline.md#writing-good-questions`,
and look at 2–3 existing questions in the target topic file to match the style.

**Write** questions that test understanding of this material, following these rules:

1. Mix of types: ~40% concept (`single`/`multiple`), ~30% calculation (`short_answer` with
   `numeric` — output shapes, parameter counts, gradients, complexity), ~20% code reading
   (PyTorch snippets), ~10% `true_false` traps.
2. Choice questions: exactly 4 options, one idea per stem, plausible distractors based on real
   misconceptions, similar length; never "all/none of the above"; add `why` to each wrong option.
3. Paraphrase. Never copy sentences from `private` or `reference` sources.
4. Every question gets an `explanation` that cites with `[^n]` and a `references` list with
   precise locators (slide/page/section). Cite the course material and, where possible, an open
   source such as d2l (`source: d2l`, with section and URL).
5. `source: {id: {{source id}}, ref: {{locator}}}`, `status: draft`, set `difficulty` and `tags`.
6. Ids: continue from the highest `<topic>-NNN` in the file; never reuse a number.

**Then** append to `src/content/quizzes/<domain>/<topic>.yaml`, run `uv run mlr check`, and fix
everything it reports. Summarize: questions added per topic, anything in the material you were
unsure about (flag it instead of guessing).
