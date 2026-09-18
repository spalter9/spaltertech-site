// Minimal service worker — exists only so Android's "Add to Home Screen"
// install prompt qualifies. Deliberately does no caching: every request
// just passes straight through to the network, so nothing here can ever
// serve stale content.
self.addEventListener('fetch', () => {});
