// 授業の引き出し Service Worker
// VERSION は tools/build.py が更新します。アプリ本体を変えたときは必ず更新してください。
const VERSION = "20260927-091933";
const SHELL_CACHE = "hikidashi-shell-" + VERSION;
const DATA_CACHE = "hikidashi-data";
const FONT_CACHE = "hikidashi-fonts";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(k => k.startsWith("hikidashi-shell-") && k !== SHELL_CACHE)
    .map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // データ：ネット優先（最新の内容を取得）、オフライン時は保存した内容
  if (url.origin === location.origin && url.pathname.endsWith("/data.json")) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(DATA_CACHE).then(c => c.put("data.json", copy)); return res;
    }).catch(() => caches.open(DATA_CACHE).then(c => c.match("data.json"))));
    return;
  }
  // フォント：保存したものを使い、裏で更新
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // アプリ本体：保存したものを使う（オフラインでも起動）
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match("./index.html"))));
  }
});
