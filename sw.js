// Service Worker for Daily Journal PWA
const CACHE_NAME = 'daily-journal-cache-v1.5'; // Updated cache version
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    'https://cdn.tailwindcss.com', // No markdown link
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    '/image/logo.png' 
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                
                return cache.addAll(urlsToCache)
                    .catch(error => {
                        console.error('Service Worker: Failed to cache some URLs during install:', error);
                        // Fallback to caching only essential local files if some external ones fail
                        return cache.addAll(['/', '/index.html', '/app.js', '/manifest.json', '/image/logo.png']);
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
            return self.clients.claim(); // Take control of all open clients
        })
    );
});


self.addEventListener('fetch', event => {
    
    if (event.request.method !== 'GET') {
        return;
    }

    
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If the fetch is successful, cache the response
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            // If the request is in cache, return it, otherwise serve the offline page (index.html)
                            return cachedResponse || caches.match('/index.html');
                        });
                })
        );
    } else {
        // For non-navigation requests (CSS, JS, images), try cache first, then network.
        // This is a "cache-first" strategy for static assets.
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse; // Serve from cache if found
                    }
                    // If not in cache, fetch from network
                    return fetch(event.request).then(
                        networkResponse => {
                            // If fetch is successful, cache the new response
                            if (networkResponse && networkResponse.ok) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            }
                            return networkResponse;
                        }
                    ).catch(error => {
                        // Handle fetch errors for assets (e.g., log them)
                        // You could return a placeholder image for failed image requests here if needed
                        console.error('Service Worker: Fetch failed for asset:', event.request.url, error);
                    });
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
            icon: icon || '/image/logo.png', // Default/fallback icon
            badge: '/image/logo.png', // Badge for Android 
            tag: `daily-journal-reminder-${title.replace(/\s+/g, '-')}`, // Unique tag to prevent stacking, make it more specific
            renotify: true, // Allow re-notifying if a notification with the same tag exists
            actions: [
                { action: 'openApp', title: 'Journal öffnen' }, 
                { action: 'dismiss', title: 'Schließen' }
            ]
        };
        event.waitUntil(
            self.registration.showNotification(title, options)
                .then(() => console.log('Service Worker: Notification shown successfully:', title))
                .catch(err => console.error('Service Worker: Error showing notification:', err))
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification click Received.', event.notification.tag);
    event.notification.close();

    // Focus an existing window or open a new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Check if there's a window already open
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                // Adjust the URL check if your app's start_url is different or more specific
                if (client.url.includes('index.html') || client.url === self.registration.scope) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
            }
            // If no window is open or focusable, open a new one
            if (clients.openWindow) {
                return clients.openWindow(self.registration.scope); // Open the PWA's root
            }
        })
    );
});
