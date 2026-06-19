/* global clients */
const CACHE_NAME = 'floating-memo-v1';
const ASSETS = [
  '/7-ai-pwa/',
  '/7-ai-pwa/index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/7-ai-pwa/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/7-ai-pwa/');
      }
    })
  );
});

// 푸시 알림 (아침 브리핑용)
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: '오늘의 할 일', body: '앱을 열어 확인하세요' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/7-ai-pwa/icon-192.png',
      badge: '/7-ai-pwa/icon-192.png',
      tag: 'morning-briefing',
      requireInteraction: true,
    })
  );
});

// W-2: 메시지 기반 알림 예약 — 탭이 닫혀도 SW가 살아있으면 알림 전송
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay, tag } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title || '플로팅 메모', {
        body: body || '',
        icon: '/7-ai-pwa/icon-192.png',
        badge: '/7-ai-pwa/icon-192.png',
        tag: tag || 'scheduled-notification',
        requireInteraction: false,
      });
    }, delay || 0);
  }
});
