// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: "https://mtoan651.github.io",
  // Served from https://mtoan651.github.io/ml-recall/ — every internal link goes through
  // `url()` in src/lib/url.ts, which prefixes import.meta.env.BASE_URL.
  base: "/ml-recall",
  // GitHub Pages serves /topics/cnn/index.html at /topics/cnn/; keep dev identical.
  trailingSlash: "always",
  // Keep single spaces between inline elements (Astro 7 defaults to JSX-style whitespace).
  compressHTML: true,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
