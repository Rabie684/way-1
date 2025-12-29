// Simple Service Worker for WAY PWA
const CACHE_NAME = 'way-cache-v2'; // تم تحديث إصدار ذاكرة التخزين المؤقت
const urlsToCache = [
  './', // index.html
  './index.html',
  './index.tsx',
  './metadata.json',
  './sw.js',
  'https://img.icons8.com/fluency/192/education.png', // أيقونة Apple Touch وأيقونة Manifest
  'https://img.icons8.com/fluency/512/education.png', // أيقونة Manifest
  'https://placehold.jp/10b981/ffffff/512x512.png?text=way&font=black-han-sans', // أيقونة Manifest
  // ملاحظة: أصول CDN (Tailwind, Google Fonts, esm.sh React/GenAI) لم يتم تخزينها مؤقتًا بشكل مكثف هنا
  // لأنها تتطلب استراتيجيات تخزين مؤقت أكثر تعقيدًا (مثل Workbox أو Cache-While-Revalidate).
  // بالنسبة لتطبيق PWA الأساسي، تعد الأصول الثابتة الخاصة بالتطبيق أمرًا بالغ الأهمية.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // تنشيط Service Worker الجديد فورًا
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
    .then(() => clients.claim()) // التحكم في العملاء الحاليين
  );
});

self.addEventListener('fetch', (event) => {
  // التعامل مع طلبات GET فقط لتجنب تخزين طلبات POST الديناميكية مؤقتًا (مثل استدعاءات API)
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // إذا كانت المورد موجودة في ذاكرة التخزين المؤقت - أرجع الاستجابة
          if (response) {
            return response;
          }
          // إذا لم تكن موجودة في ذاكرة التخزين المؤقت - اجلبها من الشبكة
          return fetch(event.request);
        })
        .catch(() => {
          // اختياري: إرجاع صفحة عدم الاتصال بالإنترنت لطلبات التنقل إذا فشلت الشبكة
          // if (event.request.mode === 'navigate') {
          //   return caches.match('/offline.html'); // يتطلب وجود ملف offline.html
          // }
          return new Response("أنت غير متصل بالإنترنت. يرجى التحقق من اتصالك.", { status: 503, statusText: "Offline" });
        })
    );
  }
});