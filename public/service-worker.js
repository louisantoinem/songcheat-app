// Self-destroying service worker.
//
// The old Create React App build registered a precaching service worker that
// still serves a stale index.html pointing at a JS bundle (main.[hash].js)
// that no longer exists after the Vite migration. Browsers that visited the
// old site keep that SW until it is removed.
//
// Deploying this file at the same URL (/service-worker.js) makes those browsers
// update to it on their next navigation; it then unregisters itself, clears all
// caches and reloads open tabs so they fetch the fresh index.html.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // delete every cache this origin created
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))

    // remove this service worker
    await self.registration.unregister()

    // force-reload any open tabs so they drop the SW-controlled stale page
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((client) => client.navigate(client.url))
  })())
})
