// 本地 Demo Service Worker：拦截 /files/ 和 /css/images/ 请求，重定向到本地 images/
// 消除 preload scanner / 瞬态 img 产生的 404（fetch 拦截器和 MutationObserver 抓不到这些）
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (event) {
  var url = event.request.url;
  if (!url) return;
  // 只处理 /files/ 或 /css/images/ 的媒体请求
  if (/\/files\/|\/css\/images\//.test(url)) {
    var base = url.split('?')[0].split('#')[0].split('/').pop();
    if (base && /\.(png|jpg|jpeg|webp|gif|mp4|mov|webm)$/i.test(base)) {
      event.respondWith(fetch('images/' + base).catch(function () {
        return new Response('', { status: 204 });
      }));
    }
  }
});
