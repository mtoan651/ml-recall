// Writes <dist>/sw.js from sw.template.js with the list of hashed build assets to precache.
// Usage (after `astro build`): node tools/web/build-sw.mjs dist
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = process.argv[2] ?? "dist";
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, "sw.template.js"), "utf8");

// Scripts, styles and figures; of the KaTeX fonts only woff2 (what browsers load).
const assets = readdirSync(join(dist, "_astro"))
  .filter((name) => /\.(js|css|svg|woff2)$/.test(name))
  .sort()
  .map((name) => `_astro/${name}`);
const version = createHash("sha256")
  .update(template)
  .update(assets.join("\n"))
  .digest("hex")
  .slice(0, 12);

writeFileSync(
  join(dist, "sw.js"),
  template.replace("__VERSION__", version).replace("__ASSETS__", JSON.stringify(assets)),
);
console.log(`sw.js: ${assets.length} assets precached, version ${version}`);
