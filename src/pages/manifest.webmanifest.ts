/**
 * Web app manifest (installable PWA). Paths go through `url()` so the base path is not
 * hard-coded; the service worker is generated after the build (tools/web/build-sw.mjs).
 */
import type { APIRoute } from "astro";
import { url } from "../lib/url";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: "ml-recall — AI/ML/DL review quizzes",
      short_name: "ml-recall",
      description:
        "Active-recall questions on AI, ML and DL: practice, timed tests and spaced repetition.",
      lang: "en",
      start_url: url(),
      scope: url(),
      display: "standalone",
      background_color: "#f7f7f5",
      theme_color: "#2b59c3",
      icons: [
        { src: url("icon-192.png"), sizes: "192x192", type: "image/png" },
        { src: url("icon-512.png"), sizes: "512x512", type: "image/png" },
        {
          src: url("icon-maskable-512.png"),
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json; charset=utf-8" } },
  );
