// ERP Pro Service Worker — MED-10 hardened
//
// التغييرات الأمنية عن النسخة السابقة:
// 1) لا تخزين أبداً لاستجابات /api/* المصادقة في Cache Storage
//    (كانت مقروءة لأي JS على المصدر) — يتجاوزها الـ SW كلياً.
// 2) CACHE_NAME مرتبط بإصدار النشر (erp-pro-shell-v3) — النسخ القديمة
//    تُحذف عند activate فلا يبقى تطبيق قديم/بيانات قديمة بعد النشر.
// 3) استراتيجية network-first لكل شيء ما عدا أصول /_next/static
//    غير القابلة للتغير (cache-first) — الصفحات تأتي دائماً من الشبكة عند توفرها.
const CACHE_NAME = 'erp-pro-shell-v3';
// الصدفة الدنيا فقط — بلا أي بيانات تطبيق
const PRECACHE_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // MED-10: مسارات API لا تمر عبر الـ SW إطلاقاً — لا كاش ولا استجابة بديلة
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    return;
  }

  // طلبات عبر نطاقات أخرى (نادرة): شبكة فقط بلا تخزين
  if (url.origin !== self.location.origin) {
    return;
  }

  // أصول Next.js المهشة (hash في اسم الملف): cache-first آمن
  const isImmutableAsset =
    url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image');

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // الصفحات وبقية الأصول: network-first — الكاش فقط عند فشل الشبكة (أوفلاين)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // الصدفة البديلة لطلبات التنقل فقط
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
