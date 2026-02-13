/**
 * Service Worker for offline article support
 * Caches static assets and enables offline reading of articles
 */

const CACHE_NAME = 'wayne-nolette-v4';
const BASE_PATH = '/wayne-nolette';
const OFFLINE_PAGE = `${BASE_PATH}/offline/`;
const CACHE_MAX_ITEMS = 150;

// Assets to cache on install - all main pages for offline access
const PRECACHE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/offline/`,
  `${BASE_PATH}/resume/`,
  `${BASE_PATH}/writing/`,
  `${BASE_PATH}/case-studies/`,
  `${BASE_PATH}/adrs/`,
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  cacheFirst: [/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$/],
  // Stale-while-revalidate for HTML pages - instant load from cache, refresh in background
  staleWhileRevalidate: [/\.html$/, /\/$/, /\/rss\.xml$/, /\/sitemap.*\.xml$/],
};

/**
 * Install event - precache essential assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - handle requests with appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (url.origin !== location.origin || request.method !== 'GET') {
    return;
  }

  const strategy = getStrategy(url.pathname);

  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

/**
 * Get caching strategy for a path
 */
function getStrategy(pathname) {
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pattern.test(pathname)) return 'cacheFirst';
  }
  for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
    if (pattern.test(pathname)) return 'staleWhileRevalidate';
  }
  return 'networkFirst';
}

/**
 * Cache first strategy - good for static assets
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      await trimCache(cache);
    }
    return response;
  } catch {
    return new Response('Asset not available offline', { status: 503 });
  }
}

/**
 * Network first strategy - good for HTML pages
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      await trimCache(cache);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('You are offline', { status: 503 });
  }
}

/**
 * Stale while revalidate - good for feeds
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.error('[SW] staleWhileRevalidate fetch failed:', error.message);
      return null;
    });

  return (
    cached ||
    (await fetchPromise) ||
    new Response('Not available', { status: 503 })
  );
}

/**
 * Message event - handle commands from the main thread
 */
self.addEventListener('message', (event) => {
  const { type, url } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_ARTICLE':
      if (url) {
        cacheArticle(url, event.source);
      }
      break;

    case 'UNCACHE_ARTICLE':
      if (url) {
        uncacheArticle(url, event.source);
      }
      break;

    case 'GET_CACHED_ARTICLES':
      getCachedArticles()
        .then((articles) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ articles });
          }
        })
        .catch((error) => {
          console.error('[SW] Failed to get cached articles:', error.message);
        });
      break;

    case 'CLEAR_CACHE':
      caches
        .delete(CACHE_NAME)
        .then(() => {
          console.log('[SW] Cache cleared');
          notifyClients({ type: 'CACHE_CLEARED' });
        })
        .catch((error) => {
          console.error('[SW] Failed to clear cache:', error.message);
        });
      break;
  }
});

/**
 * Cache an article for offline reading
 */
async function cacheArticle(url, _source) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(url);
    console.log('[SW] Cached article:', url);
    notifyClients({ type: 'ARTICLE_CACHED', url });
  } catch (error) {
    console.error('[SW] Failed to cache article:', error);
    notifyClients({ type: 'CACHE_ERROR', url, error: error.message });
  }
}

/**
 * Remove an article from the cache
 */
async function uncacheArticle(url, _source) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
    console.log('[SW] Removed article from cache:', url);
    notifyClients({ type: 'ARTICLE_UNCACHED', url });
  } catch (error) {
    console.error('[SW] Failed to uncache article:', error);
  }
}

/**
 * Get list of cached articles
 */
async function getCachedArticles() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    return keys
      .filter((request) => {
        const url = new URL(request.url);
        return (
          (url.pathname.startsWith(`${BASE_PATH}/writing/`) ||
            url.pathname.startsWith(`${BASE_PATH}/case-studies/`)) &&
          url.pathname !== `${BASE_PATH}/writing/` &&
          url.pathname !== `${BASE_PATH}/case-studies/`
        );
      })
      .map((request) => {
        const url = new URL(request.url);
        return url.pathname;
      });
  } catch {
    return [];
  }
}

/**
 * Trim cache to prevent unbounded growth (LRU eviction)
 */
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > CACHE_MAX_ITEMS) {
    // Delete oldest entries (first in list) until under limit
    const excess = keys.length - CACHE_MAX_ITEMS;
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
  }
}

/**
 * Notify all clients of an event
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(message);
  });
}
