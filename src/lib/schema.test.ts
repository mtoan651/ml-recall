/**
 * Keeps the Zod mirror (schema.ts) in sync with the pydantic source of truth, via the JSON
 * Schemas that `uv run mlr schema` exports to schema/*.schema.json, and validates the bank.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  domainSchema,
  figureSchema,
  optionSchema,
  provenanceSchema,
  questionSchema,
  quizFileSchema,
  referenceSchema,
  shortAnswerSchema,
  sourceRegistrySchema,
  sourceSchema,
  taxonomySchema,
  topicSchema,
} from "./schema";

interface JsonSchemaObject {
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}
interface JsonSchemaProperty {
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchemaProperty[];
}
interface JsonSchemaFile extends JsonSchemaObject {
  $defs?: Record<string, JsonSchemaObject>;
}

const loadJsonSchema = (name: string): JsonSchemaFile =>
  JSON.parse(readFileSync(join("schema", `${name}.schema.json`), "utf8"));

const quiz = loadJsonSchema("quiz");
const taxonomy = loadJsonSchema("taxonomy");
const sources = loadJsonSchema("sources");
const defs = { ...quiz.$defs, ...taxonomy.$defs, ...sources.$defs };

type AnyObject = z.ZodObject<z.ZodRawShape>;
const PAIRS: Array<[string, JsonSchemaObject | undefined, AnyObject]> = [
  ["Figure", defs.Figure, figureSchema],
  ["Option", defs.Option, optionSchema],
  ["Reference", defs.Reference, referenceSchema],
  ["Provenance", defs.Provenance, provenanceSchema],
  ["ShortAnswer", defs.ShortAnswer, shortAnswerSchema],
  ["Question", defs.Question, questionSchema],
  ["QuizFile", quiz, quizFileSchema],
  ["Topic", defs.Topic, topicSchema],
  ["Domain", defs.Domain, domainSchema],
  ["Taxonomy", taxonomy, taxonomySchema],
  ["Source", defs.Source, sourceSchema],
  ["SourceRegistry", sources, sourceRegistrySchema],
] as unknown as Array<[string, JsonSchemaObject | undefined, AnyObject]>;

const accepts = (schema: z.core.$ZodType | undefined, value: unknown): boolean =>
  schema !== undefined && z.safeParse(schema, value).success;

/** Enum values of a JSON Schema property (also inside `anyOf: [{enum}, {type: null}]`). */
function enumOf(prop: JsonSchemaProperty): unknown[] | undefined {
  return prop.enum ?? prop.anyOf?.find((p) => p.enum)?.enum;
}

describe("Zod mirror of tools/mlrecall/schema.py", () => {
  it.each(PAIRS)("%s has the same fields, required fields and enums", (_name, json, zod) => {
    expect(json).toBeDefined();
    if (!json) return;
    const shape = zod.shape;
    expect(Object.keys(shape).sort()).toEqual(Object.keys(json.properties).sort());

    const requiredInZod = Object.keys(shape)
      .filter((key) => !accepts(shape[key], undefined))
      .sort();
    expect(requiredInZod).toEqual([...(json.required ?? [])].sort());

    for (const [key, prop] of Object.entries(json.properties)) {
      const values = enumOf(prop);
      if (!values) continue;
      for (const value of values) {
        expect(accepts(shape[key], value), `${key} accepts ${value}`).toBe(true);
      }
      expect(accepts(shape[key], "not-a-valid-enum-value")).toBe(false);
    }
  });

  it("rejects unknown fields like pydantic's extra=forbid", () => {
    const result = topicSchema.safeParse({ id: "cnn", title: "CNN", colour: "blue" });
    expect(result.success).toBe(false);
  });
});

const base = {
  id: "cnn-900",
  question: "What?",
  source: { id: "original", ref: "cnn-900" },
  status: "draft",
};

describe("question rules (Question._consistent)", () => {
  const ok = (q: object) => questionSchema.safeParse({ ...base, ...q }).success;

  it("accepts a valid single-choice question", () => {
    expect(ok({ type: "single", options: [{ text: "a", correct: true }, { text: "b" }] })).toBe(
      true,
    );
  });

  it("needs exactly one correct option for single and true_false", () => {
    expect(ok({ type: "single", options: [{ text: "a" }, { text: "b" }] })).toBe(false);
    expect(
      ok({
        type: "single",
        options: [
          { text: "a", correct: true },
          { text: "b", correct: true },
        ],
      }),
    ).toBe(false);
    expect(
      ok({
        type: "true_false",
        options: [{ text: "True", correct: true }, { text: "False" }, { text: "Maybe" }],
      }),
    ).toBe(false);
  });

  it("allows several correct options for multiple", () => {
    expect(
      ok({
        type: "multiple",
        options: [
          { text: "a", correct: true },
          { text: "b", correct: true },
        ],
      }),
    ).toBe(true);
  });

  it("rejects duplicate option text and options on short answers", () => {
    expect(ok({ type: "single", options: [{ text: "A", correct: true }, { text: " a " }] })).toBe(
      false,
    );
    expect(ok({ type: "short_answer", answer: { model: "x" }, options: [{ text: "a" }] })).toBe(
      false,
    );
    expect(ok({ type: "short_answer" })).toBe(false);
    expect(ok({ type: "short_answer", answer: { model: "x", numeric: 3 } })).toBe(true);
  });

  it("requires difficulty and a cited explanation when reviewed", () => {
    const refs = [{ source: "d2l" }];
    const q = {
      type: "short_answer",
      answer: { model: "x" },
      status: "reviewed",
      references: refs,
    };
    expect(ok(q)).toBe(false);
    expect(ok({ ...q, difficulty: "easy", explanation: "Because." })).toBe(false);
    expect(ok({ ...q, difficulty: "easy", explanation: "Because [^1]." })).toBe(true);
    expect(ok({ ...q, difficulty: "easy", explanation: "Because $[^1]$." })).toBe(false);
  });

  it("checks that every citation marker has a reference", () => {
    const q = { type: "short_answer", answer: { model: "x [^2]" }, references: [{ title: "T" }] };
    expect(ok(q)).toBe(false);
    expect(ok({ ...q, references: [{ title: "T" }, { url: "https://example.org" }] })).toBe(true);
  });

  it("requires references to identify a work and urls to be http(s)", () => {
    expect(referenceSchema.safeParse({ locator: "p. 3" }).success).toBe(false);
    expect(referenceSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
    expect(referenceSchema.safeParse({ url: "https://d2l.ai" }).success).toBe(true);
  });
});

describe("the question bank in src/content", () => {
  const content = join("src", "content");
  const quizFiles = readdirSync(join(content, "quizzes"), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".yaml"))
    .sort();

  it("has quiz files", () => {
    expect(quizFiles.length).toBeGreaterThan(0);
  });

  it.each(quizFiles)("%s matches the schema", (file) => {
    const data = parse(readFileSync(join(content, "quizzes", file), "utf8"));
    const result = quizFileSchema.safeParse(data);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it("taxonomy.yaml and sources.yaml match the schema", () => {
    const tax = taxonomySchema.safeParse(
      parse(readFileSync(join(content, "taxonomy.yaml"), "utf8")),
    );
    const src = sourceRegistrySchema.safeParse(
      parse(readFileSync(join(content, "sources.yaml"), "utf8")),
    );
    expect(tax.error?.issues ?? []).toEqual([]);
    expect(src.error?.issues ?? []).toEqual([]);
  });
});
