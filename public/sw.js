// Service Worker for Sunclaude PWA
const CACHE_NAME = 'sunclaude-v1.0.0'
const STATIC_CACHE_NAME = 'sunclaude-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'sunclaude-dynamic-v1.0.0'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API routes that should be cached
const API_CACHE_PATTERNS = [
  /^\/api\/tasks/,
  /^\/api\/integrations/
]

// Network-first resources (always try network first)
const NETWORK_FIRST_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/sync/
]

// Cache-first resources (always try cache first)
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|woff|woff2|ttf|eot)$/,
  /\/_next\/static/
]

self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Static assets cached')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('[SW] Error during install:', error)
      })
  )
})

self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
      .catch(error => {
        console.error('[SW] Error during activation:', error)
      })
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Handle different caching strategies
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request))
  } else if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request))
  } else if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request))
  } else {
    event.respondWith(networkFirst(request))
  }
})

// Network-first strategy
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { status: 503 })
    }
    
    throw error
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache-first failed:', error)
    throw error
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  // Fetch from network in the background
  const networkPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch(error => {
      console.log('[SW] Network request failed:', error)
      return null
    })
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Otherwise wait for network
  return networkPromise
}

// Background sync for task operations
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'task-sync') {
    event.waitUntil(syncTasks())
  } else if (event.tag === 'integration-sync') {
    event.waitUntil(syncIntegrations())
  }
})

async function syncTasks() {
  try {
    console.log('[SW] Syncing tasks in background...')
    
    // Get pending task operations from IndexedDB
    const pendingOperations = await getPendingOperations('tasks')
    
    for (const operation of pendingOperations) {
      try {
        await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        })
        
        // Remove from pending operations
        await removePendingOperation('tasks', operation.id)
        console.log('[SW] Successfully synced task operation:', operation.id)
      } catch (error) {
        console.error('[SW] Failed to sync task operation:', operation.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Task sync failed:', error)
  }
}

async function syncIntegrations() {
  try {
    console.log('[SW] Syncing integrations in background...')
    
    // Trigger integration sync endpoints
    const integrations = ['gmail', 'calendar', 'github', 'asana']
    
    await Promise.allSettled(
      integrations.map(integration =>
        fetch(`/api/integrations/${integration}/sync`, { method: 'POST' })
          .catch(error => console.log(`[SW] ${integration} sync failed:`, error))
      )
    )
    
    console.log('[SW] Integration sync completed')
  } catch (error) {
    console.error('[SW] Integration sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push message received')
  
  const options = {
    body: 'You have new tasks to review',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Tasks',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification('Sunclaude', options)
  )
})

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?source=notification')
    )
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Helper functions for IndexedDB operations
async function getPendingOperations(type) {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return []
}

async function removePendingOperation(type, id) {
  // In a real implementation, this would remove from IndexedDB
  console.log(`[SW] Would remove pending operation: ${type}/${id}`)
}

// Share target handling
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request))
  }
})

async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') || ''
    const text = formData.get('text') || ''
    const url = formData.get('url') || ''
    
    // Store shared content for the app to pick up
    const shareData = {
      title: title.toString(),
      text: text.toString(),
      url: url.toString(),
      timestamp: Date.now()
    }
    
    // In a real implementation, you'd store this in IndexedDB
    // and the app would check for it on startup
    
    return Response.redirect('/?shared=true')
  } catch (error) {
    console.error('[SW] Share target handling failed:', error)
    return Response.redirect('/')
  }
}