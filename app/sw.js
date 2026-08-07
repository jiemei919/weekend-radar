// 周末雷达 Service Worker
// 策略（2026-08-06 修正）：所有资源统一 network-first，避免 HTML 与 JS 版本不一致导致页面白屏/卡片区消失。
// 离线时回退缓存；每次部署后用户下一次访问即拿到全套新文件。
const CACHE = 'radar-v18';
const ASSETS = [
  './', './index.html', './config.js', './data.js', './holidays.js', './visited.js',
  './taste-profile.js', './candidates.js', './match-engine.js', './hot-pool.js',
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

  // 所有资源 network-first：先请求网络，成功则更新缓存并返回；失败/离线才用缓存兜底
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.status === 200) {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
      }
      return resp;
    }).catch(() =>
      caches.match(e.request).then(r => r || caches.match('./index.html'))
    )
  );
});
