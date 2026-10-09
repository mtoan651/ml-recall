/**
 * Content collections: the YAML bank under src/content/ is loaded and validated here at build
 * time. Any schema violation fails `astro build` / `astro dev`.
 *
 * - `quizzes`  — one entry per topic file, src/content/quizzes/<domain>/<topic>.yaml
 * - `domains`  — taxonomy.yaml, one entry per domain (with its topics), in file order
 * - `sources`  — sources.yaml, the source registry
 */

import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";
import {
  domainSchema,
  formatIssues,
  quizFileSchema,
  sourceRegistrySchema,
  sourceSchema,
  taxonomySchema,
} from "./lib/schema";

/** Parses a registry-style YAML file, validates the whole document and returns its entries. */
function registryParser<T extends z.ZodType>(
  fileName: string,
  schema: T,
  pick: (doc: z.output<T>) => Record<string, unknown>[],
) {
  return (text: string) => {
    const result = schema.safeParse(parse(text));
    if (!result.success) {
      throw new Error(`${fileName} does not match the schema:\n${formatIssues(result.error)}`);
    }
    return pick(result.data);
  };
}

const quizzes = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/quizzes" }),
  schema: quizFileSchema,
});

const domains = defineCollection({
  loader: file("src/content/taxonomy.yaml", {
    // `order` keeps the taxonomy order (collections are not guaranteed to be ordered).
    parser: registryParser("taxonomy.yaml", taxonomySchema, (doc) =>
      doc.domains.map((domain, order) => ({ ...domain, order })),
    ),
  }),
  schema: domainSchema.extend({ order: z.int().nonnegative() }),
});

const sources = defineCollection({
  loader: file("src/content/sources.yaml", {
    parser: registryParser("sources.yaml", sourceRegistrySchema, (doc) => doc.sources),
  }),
  schema: sourceSchema,
});

export const collections = { quizzes, domains, sources };
