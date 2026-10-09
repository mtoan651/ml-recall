import { defineConfig } from "vitest/config";

// Unit tests for the pure logic in src/lib/ (no Astro runtime needed).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
