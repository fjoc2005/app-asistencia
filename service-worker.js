/**
 * Service Worker - APP Asistencia v3.0.6
 * Estrategias de caché mejoradas y versionado
 */

const CACHE_VERSION = 'v3.0.6';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Recursos estáticos para pre-cachear
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/registro.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// URLs que NO deben cachearse (páginas sensibles)
const EXCLUDED_URLS = [
    '/admin-login.html',
    '/admin.html',
    '/admin.js',
    '/google-drive-integration.js'
];

// Instalación: Pre-cachear recursos estáticos
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker v' + CACHE_VERSION);

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Pre-cacheando recursos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activación: Limpiar cachés antiguos
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker v' + CACHE_VERSION);

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
                        .map(name => {
                            console.log('[SW] Eliminando caché antiguo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch: Estrategias de caché
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requests no-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }

    // No cachear páginas excluidas (admin, login)
    if (EXCLUDED_URLS.some(path => url.pathname.includes(path))) {
        return event.respondWith(fetch(request));
    }

    // Network First para APIs y datos dinámicos
    if (url.pathname.includes('/api/') || url.pathname.includes('.json')) {
        return event.respondWith(networkFirst(request));
    }

    // Cache First para imágenes
    if (request.destination === 'image') {
        return event.respondWith(cacheFirst(request, IMAGE_CACHE));
    }

    // Stale While Revalidate para CSS/JS
    if (request.destination === 'style' || request.destination === 'script') {
        return event.respondWith(staleWhileRevalidate(request));
    }

    // Cache First para todo lo demás
    event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// Estrategia: Cache First
async function cacheFirst(request, cacheName = STATIC_CACHE) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Fetch falló:', error);
        // Retornar página offline si existe
        return caches.match('/offline.html') || new Response('Sin conexión', { status: 503 });
    }
}

// Estrategia: Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Estrategia: Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            const cache = caches.open(STATIC_CACHE);
            cache.then(c => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    });

    return cachedResponse || fetchPromise;
}

// Mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
