// Service Worker — Vase d'honneur PWA
// Permet à l'app de fonctionner hors ligne et de se mettre à jour automatiquement.

const CACHE_NAME = 'vase-honneur-v1'
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png'
]

// Installation : mise en cache des ressources de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  )
  self.skipWaiting()
})

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  )
  self.clients.claim()
})

// Fetch : stratégie "network first" pour les données fraîches,
// fallback sur le cache si hors ligne
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignore les méthodes non-GET
  if (request.method !== 'GET') return

  // Ignore les appels API externes (Firebase, Midvash...)
  const url = new URL(request.url)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('midvash') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Met en cache la nouvelle version
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  )
})