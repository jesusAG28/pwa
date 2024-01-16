// Obtener el service worker actual
// const sw = navigator.serviceWorker.controller;
const sw = self;

const BASE_URL = 'https://pwa.test/';

// Variable para controlar el estado de la actualización
let updatingCache = false;

let CACHE_NAME = 'v1.0';

// Archivos para almacenar en caché
const urlsToCache = [
    '/',
    '/assets/style.css',
    '/assets/app.js',
    '/index.html'
];

// Evento de instalación
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('meta-data').then(cache => {
            return cache.match('CACHE_NAME').then(response => {
                if (response) {
                    return response.text();
                }
                return null;
            });
        })
            .then(savedCacheName => {
                const initialCacheName = savedCacheName || CACHE_NAME;
                console.log('Loaded with cache:', initialCacheName);

                // Almacenar los archivos en caché durante la instalación
                return caches.open(initialCacheName).then(cache => {
                    return cache.addAll(urlsToCache);
                });
            })
            .then(() => {
                // Activar el service worker inmediatamente después de la instalación
                return self.skipWaiting();
            })
    );
});

// Evento de activación
self.addEventListener('activate', event => {
    self.clients.claim();
    event.waitUntil(
        // Realizar tareas de activación, como eliminar cachés antiguas
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        })
            // Escribir el nuevo valor en la caché 'meta-data'
            .then(() => caches.open('meta-data'))
            .then(cache => cache.put('CACHE_NAME', CACHE_NAME))
    );
});

// Evento de solicitud
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});

function checkForUpdate() {
    // Verificar si ya se está actualizando el caché
    if (updatingCache) {
        console.log('La actualización del caché está en curso. Esperando...');
        return;
    }

    updatingCache = true;

    // Obtener la versión actual del caché
    let currentCacheName;

    caches.open('meta-data').then(metaCache => {
        return metaCache.match('CACHE_NAME');
    }).then(response => {
        if (response) {
            return response.text();
        }
        return null;
    }).then(savedCacheName => {
        currentCacheName = savedCacheName || 'v1.0';
        console.log('Versión de caché:', currentCacheName);

        // Fetch de la versión del servidor
        fetch(BASE_URL + 'version.json', { cache: 'no-store' })
            .then(response => response.json())
            .then(data => {
                const serverVersion = data.version;
                console.log('Versión del servidor:', serverVersion);

                // Comprobar si hay una nueva versión
                if (serverVersion > currentCacheName) {
                    console.log('Nueva versión encontrada. Actualizando...');

                    // Descargar y activar la nueva versión
                    caches.open(serverVersion)
                        .then(cache => {
                            return cache.addAll(urlsToCache);
                        })
                        .then(() => {
                            // Abrir la caché 'meta-data' y actualizar el valor
                            return caches.open('meta-data').then(metaCache => {
                                // Utilizar 'put' con una nueva Response para almacenar el valor
                                return metaCache.put('CACHE_NAME', new Response(serverVersion));
                            });
                        })
                        .then(() => {
                            console.log('Service worker actualizado a la versión', serverVersion);
                            showUpdateNotification(true, serverVersion);

                            // Forzar al nuevo Service Worker a tomar el control inmediato
                            self.skipWaiting();

                            // Recargar las páginas controladas por el Service Worker
                            self.clients.claim();

                            // Opcional: Puedes enviar un mensaje a las páginas para que se recarguen
                            self.clients.matchAll().then(clients => {
                                clients.forEach(client => {
                                    client.postMessage({ type: 'reload', message: 'Service Worker updated' });
                                });
                            });

                        })
                        .catch(error => {
                            console.error('Error al actualizar el service worker:', error);
                            showUpdateNotification(false, currentCacheName);
                        })
                        .finally(() => {
                            updatingCache = false; // Marcar que la actualización ha terminado
                        });
                } else {
                    updatingCache = false; // Marcar que la actualización ha terminado
                }
            })
            .catch(error => {
                console.error('Error al comprobar la versión del servidor:', error);
                showUpdateNotification(false, currentCacheName);
                updatingCache = false; // Marcar que la actualización ha terminado en caso de error
            });
    });
}


function showUpdateNotification(status = false, version = '') {
    let status_msg = status ? 'Actualización completada' : 'Actualización fallida';
    let message = status ? 'Actualizado con éxito a la versión ' + version : 'Error de actualizacion, se mantiene la versión ' + version;

    self.registration.showNotification(status_msg, {
        body: message,
        icon: '/icon.png',
        vibrate: [200, 100],
        data: { url: "'" + BASE_URL + "'" } // Puedes especificar la URL a la que redirigir al hacer clic
    });
}

// Verificar la actualización cada 24 horas (ajusta según tus necesidades)
setInterval(checkForUpdate, 5 * 1000); // 30s
// setInterval(checkForUpdate, 24 * 60 * 60 * 1000); // 24H
