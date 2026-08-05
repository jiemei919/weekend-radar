// 周末雷达 Service Worker
// 关键策略（2026-08-05 修正）：HTML 永远走网络取最新，避免旧缓存钉死 bug 修复导致「部署了却看不到」。
// 静态资源用 stale-while-revalidate：秒开 + 后台静默更新，下次访问即最新。
const CACHE = 'radar-v12';
const ASSETS = [
  './', './index.html', './config.js', './data.js', './holidays.js', './visited.js',
  './taste-profile.js', './candidates.js', './match-engine.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // 只处理同源 GET
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  const url = new URL(e.request.url);
  const isHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    // HTML：network-first，保证每次部署立刻生效；离线才回退缓存
    e.respondWith(
      fetch(e.request).then(resp => {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：stale-while-revalidate（先返回缓存秒开，后台拉最新并写回）
  e.respondWith(
    caches.match(e.request).then(r => {
      const fetched = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const cp = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return resp;
      }).catch(() => r);
      return r || fetched;
    })
  );
});
