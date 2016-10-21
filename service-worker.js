var dataCacheName = 'weatherData-v7';
var cacheName = 'weatherPWA-step-7-1';
var filesToCache = [
    './',
    './index.html',
    './scripts/app.js',
    './styles/inline.css',
    './images/ic_add_white_24px.svg',
    './images/ic_logout_white_24px.svg',
    './images/ic_notifications_white_24px.svg',
    './images/ic_cross_white_24px.svg',
    './images/ic_refresh_white_24px.svg'
];

//Adding `install` event listener
self.addEventListener('install', function (event) {
    console.info('Event: Install');
    event.waitUntil(
        caches.open(cacheName)
            .then(function (cache) {
                //[] of files to cache & if any of the file not present `addAll` will fail
                return cache.addAll(filesToCache)
                    .then(function () {
                        console.info('All files are cached');
                        return self.skipWaiting(); //To forces the waiting service worker to become the active service worker
                    })
                    .catch(function (error) {
                        console.error('Failed to cache', error);
                    })
            })
    );
});

/*
 FETCH EVENT: triggered for every request made by index page, after install.
 */

//Adding `fetch` event listener
self.addEventListener('fetch', function (event) {
    console.info('Event: Fetch');

    var request = event.request;

    //Tell the browser to wait for newtwork request and respond with below
    event.respondWith(
        //If request is already in cache, return it
        caches.match(request).then(function(response) {
            if (response) {
                return response;
            }

            //if request is not cached, add it to cache
            return fetch(request).then(function(response) {
                var responseToCache = response.clone();
                caches.open(cacheName).then(
                    function(cache) {
                        cache.put(request, responseToCache).catch(function(err) {
                            console.warn(request.url + ': ' + err.message);
                        });
                    });

                return response;
            });
        })
    );
});

/*
 ACTIVATE EVENT: triggered once after registering, also used to clean up caches.
 */

//Adding `activate` event listener
self.addEventListener('activate', function (event) {
    console.info('Event: Activate');

    //Active Service Worker to set itself as the active on current client and all other active clients.
    return self.clients.claim();
});

/*
 PUSH EVENT: triggered everytime, when a push notification is received.
 */

//Adding `push` event listener
self.addEventListener('push', function(event) {
    console.info('Event: Push');

    var title = 'Push notification demo';
    var body = {
        'body': 'click to return to application',
        'tag': 'demo',
        'icon': './images/icons/apple-touch-icon.png',
        'badge': './images/icons/apple-touch-icon.png',
        //Custom actions buttons
        'actions': [
            { "action": "yes", "title": "I ♥ this app!"},
            { "action": "no", "title": "I don\'t like this app"}
        ]
    };

    event.waitUntil(self.registration.showNotification(title, body));
});

/*
 BACKGROUND SYNC EVENT: triggers after `bg sync` registration and page has network connection.
 It will try and fetch github username, if its fulfills then sync is complete. If it fails,
 another sync is scheduled to retry (will will also waits for network connection)
 */

self.addEventListener('sync', function(event) {
    console.info('Event: Sync');

    //Check registered sync name or emulated sync from devTools
    if (event.tag === 'github' || event.tag === 'test-tag-from-devtools') {
        event.waitUntil(
            //To check all opened tabs and send postMessage to those tabs
            self.clients.matchAll().then(function (all) {
                return all.map(function (client) {
                    return client.postMessage('online'); //To make fetch request, check app.js - line no: 122
                })
            })
                .catch(function (error) {
                    console.error(error);
                })
        );
    }
});