// MedSchedule Service Worker
// ⚠️  Tăng số version mỗi khi deploy bản mới để buộc update
const CACHE_VERSION = 'v2';
const CACHE_NAME = `medschedule-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL: cache tất cả assets ──────────────────────────────
self.addEventListener('install', e => {
  console.log(`[SW] Installing ${CACHE_NAME}`);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // kích hoạt ngay, không chờ tab đóng
  );
});

// ── ACTIVATE: xóa cache cũ ────────────────────────────────────
self.addEventListener('activate', e => {
  console.log(`[SW] Activated ${CACHE_NAME} – cleaning old caches`);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('medschedule-') && k !== CACHE_NAME)
          .map(k => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim()) // kiểm soát tất cả tab ngay lập tức
  );
});

// ── FETCH: Network-first cho HTML, Cache-first cho assets ─────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Bỏ qua các request không phải GET hoặc cross-origin
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // HTML: luôn thử lấy từ network trước (để có bản mới nhất)
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request) || caches.match('./index.html'))
    );
    return;
  }

  // CSS/JS/Images: cache-first (nhanh hơn)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// ── MESSAGE: nhận lệnh skipWaiting từ app ─────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

