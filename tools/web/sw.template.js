/*
 * ml-recall service worker — generated into dist/sw.js by tools/web/build-sw.mjs (do not edit
 * dist/sw.js). Offline support for a static site under a base path (the registration scope):
 *
 * - install: precache the app shell pages and every hashed build asset (scripts, styles,
 *   figures, KaTeX woff2 fonts), so the main pages work offline even if never opened;
 * - pages: network first, every page opened online is kept (at most MAX_PAGES), offline the
 *   kept copy is served, else the offline page;
 * - hashed assets (`_astro/`): cache first (they never change under the same name);
 * - everything else (question JSON, search index, icons): stale-while-revalidate.
 *
 * Lookups ignore `Vary`: precached responses were fetched without the `Origin` header that
 * module-script requests carry, and a `Vary: Origin` from the server would otherwise make
 * them miss offline.
 */
const VERSION = "__VERSION__";
const ASSETS = __ASSETS__;
const SHELL = ["", "review/", "exam/", "mistakes/", "progress/", "search/", "offline/"];
const PRECACHE = `ml-recall-precache-${VERSION}`;
const PAGES = "ml-recall-pages-v1";
const RUNTIME = "ml-recall-runtime-v1";
const MAX_PAGES = 400;
const MATCH = { ignoreVary: true };

const scope = new URL(self.registration.scope);
const at = (path) => new URL(path, scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll([...SHELL, ...ASSETS].map(at)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ml-recall-precache-") && key !== PRECACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) {
    await cache.delete(request);
  }
}

async function page(request) {
  const pages = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await pages.put(request, response.clone());
      trim(pages);
    }
    return response;
  } catch {
    const kept =
      (await pages.match(request, { ...MATCH, ignoreSearch: true })) ??
      (await caches.match(request, { ...MATCH, ignoreSearch: true }));
    return kept ?? (await caches.match(at("offline/"), MATCH)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request, MATCH);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) (await caches.open(RUNTIME)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await caches.match(request, MATCH);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit ?? Response.error());
  return hit ?? fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(page(request));
  } else if (url.pathname.startsWith(`${scope.pathname}_astro/`)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
