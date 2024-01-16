// Obtener el service worker actual
// const sw = navigator.serviceWorker.controller;
const sw = self;

// Variable para controlar el estado de la actualización
let updatingCache = false;

let CACHE_NAME = 'v1.0';

// Archivos para almacenar en caché
const urlsToCache = [
    '/',
    '/assets/style.css',
    '/assets/app.js'
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

function showUpdateNotification() {
    self.registration.showNotification('Actualización Disponible', {
        body: 'Hay una nueva versión disponible. Haz clic para actualizar.',
        icon: '/path/to/notification-icon.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: { url: '/reload.html' } // Puedes especificar la URL a la que redirigir al hacer clic
    });
}

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
        fetch('https://pwa.test/version.json', { cache: 'no-store' })
            .then(response => response.json())
            .then(data => {
                const serverVersion = data.version;
                console.log('Versión del servidor:', serverVersion);

                // Comprobar si hay una nueva versión
                if (serverVersion > currentCacheName) {
                    console.log('Nueva versión encontrada. Actualizando...');

                    // Mostrar la notificación de actualización
                    showUpdateNotification();

                    // Resto del código de actualización permanece igual...
                    // Descargar y activar la nueva versión, etc.
                } else {
                    updatingCache = false; // Marcar que la actualización ha terminado
                }
            })
            .catch(error => {
                console.error('Error al comprobar la versión del servidor:', error);
                updatingCache = false; // Marcar que la actualización ha terminado en caso de error
            });
    });
}



// Verificar la actualización cada 24 horas (ajusta según tus necesidades)
setInterval(checkForUpdate, 5 * 1000); // 30s
// setInterval(checkForUpdate, 24 * 60 * 60 * 1000); // 24H
