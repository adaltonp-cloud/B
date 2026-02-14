
const CACHE_NAME = 'neon-dash-ultimate-v1.0.2';
const OFFLINE_URL = './index.html';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './constants.ts',
  './services/audioService.ts',
  './services/saveService.ts',
  './components/GameCanvas.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap'
];

// Instalação: Cacheia os recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Cacheando recursos estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('PWA: Removendo cache antigo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de Requisições: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Se a rede responder, atualiza o cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se falhar (offline) e for navegação, retorna a página inicial
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });

      // Retorna o cache imediatamente se houver, senão espera a rede
      return cachedResponse || fetchPromise;
    })
  );
});
