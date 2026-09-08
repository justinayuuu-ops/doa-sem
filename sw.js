/* 도아 셈 — 오프라인 실행용 서비스 워커
   화면(HTML)은 네트워크 우선: 새 버전을 올리면 바로 반영된다.
   아이콘·글꼴은 캐시 우선: 지하철이나 비행기 모드에서도 앱이 그대로 뜬다.
   훈련 기록 자체는 여기 캐시가 아니라 localStorage 에 있으므로
   캐시를 비워도 데이터는 사라지지 않는다. */

var VERSION = "doasem-2026-09-07";
var PREFIX = "doasem-";
var SHELL = PREFIX + "shell-" + VERSION;
var FONTS = PREFIX + "fonts-" + VERSION;

var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./apple-touch-icon-precomposed.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./favicon-48.png",
  "./KakaoSmallSans-Regular.woff2",
  "./KakaoSmallSans-Bold.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      /* 파일 하나가 없어도 설치가 통째로 실패하지 않게 개별로 담는다 */
      return Promise.all(SHELL_FILES.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        /* 다른 앱의 캐시는 건드리지 않는다 */
        if (k.indexOf(PREFIX) === 0 && k !== SHELL && k !== FONTS) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});

function networkFirst(req, cacheName) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(cacheName).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || caches.match("./index.html");
    });
  });
}

function cacheFirst(req, cacheName) {
  return caches.match(req).then(function (hit) {
    if (hit) {
      /* 뒤에서 조용히 갱신 */
      fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          caches.open(cacheName).then(function (c) { c.put(req, res); });
        }
      }).catch(function () {});
      return hit;
    }
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        var copy = res.clone();
        caches.open(cacheName).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  /* 구글 폰트 — 캐시 우선 */
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONTS));
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* 화면 이동 — 네트워크 우선, 끊기면 캐시된 화면 */
  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, SHELL));
    return;
  }

  e.respondWith(cacheFirst(req, SHELL));
});
