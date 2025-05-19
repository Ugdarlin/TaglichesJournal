// Service Worker for Daily Journal PWA
const CACHE_NAME = 'daily-journal-cache-v1.4'; 
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)',
    '[https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap)',
    // Icon for notifications 
    '[image\logo.png](image\logo.png)'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                const requests = urlsToCache.map(url => new Request(url, { mode: 'cors' }));
                return cache.addAll(requests)
                    .catch(error => {
                        console.error('Service Worker: Failed to cache some URLs during install:', error);
                        return cache.addAll(['/', '/index.html', '/app.js', '/manifest.json']);
                    });
            })
            .then(() => {
                console.log('Service Worker: Installation complete.');
                return self.skipWaiting();
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete. Now controlling clients.');
            return self.clients.claim();
        })
    );
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then(cachedResponse => cachedResponse || caches.match('/index.html')))
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    return fetch(event.request).then(
                        networkResponse => {
                            if (networkResponse && networkResponse.ok) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                            }
                            return networkResponse;
                        }
                    ).catch(error => console.error('Service Worker: Fetch failed for asset:', event.request.url, error));
                })
        );
    }
});

// Listen for messages from the client (app.js)
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    if (event.data && event.data.action === 'showDailyNotification') {
        const { title, body, icon } = event.data;
        const options = {
            body: body,
            icon: icon || '[https://placehold.co/192x192/4A90E2/FFFFFF?text=TJ](https://placehold.co/192x192/4A90E2/FFFFFF?text=TJ)', // Default icon
            badge: '[https://placehold.co/96x96/4A90E2/FFFFFF?text=TJ](https://placehold.co/96x96/4A90E2/FFFFFF?text=TJ)', // Badge for Android
            tag: 'daily-journal-reminder', // Unique tag to prevent stacking notifications
            renotify: true, // Allow re-notifying if a notification with the same tag exists
            actions: [ // Optional: Add actions to the notification
                // { action: 'openApp', title: 'Journal öffnen' },
                // { action: 'dismiss', title: 'Schließen' }
            ]
            // Note: To handle notification clicks/actions, you'd add a 'notificationclick' event listener
        };
        // Ensure event.waitUntil is used to keep the SW alive until notification is shown
        event.waitUntil(
            self.registration.showNotification(title, options)
                .then(() => console.log('Service Worker: Notification shown successfully'))
                .catch(err => console.error('Service Worker: Error showing notification:', err))
        );
    }
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification click Received.', event.notification.tag);
    event.notification.close(); // Close the notification

    // Example: Focus an existing window or open a new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                // Check if the client is the PWA itself (you might need a more specific check)
                if (client.url === '/' && 'focus' in client) { // Or your app's specific start_url
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow('/'); // Or your app's specific start_url
            }
        })
    );
});
