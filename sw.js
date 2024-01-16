// Nombre del caché
// if CACHE_NAME != version.json->version = auto update app
const CACHE_NAME = 'v1.6';

// Obtener el service worker actual
// const sw = navigator.serviceWorker.controller;
const sw = self;

// Archivos para almacenar en caché
const urlsToCache = [
    '/',
    '/assets/style.css',
    '/assets/app.js'
];


// Evento de instalación
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caché abierto');
            return cache.addAll(urlsToCache);
        })
    );
});

// Evento de activación
self.addEventListener('activate', event => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        })
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
    fetch('/version.json') // Cambia la ruta según tu estructura de servidor
        .then(response => response.json())
        .then(data => {
            const serverVersion = data.version;
            console.log('Versión del servidor:', serverVersion);
            console.log('Versión de cahce:', CACHE_NAME);

            // Comprobar si hay una nueva versión
            if (serverVersion != CACHE_NAME) {
                console.log('Nueva versión encontrada. Actualizando...');

                // Descargar y activar la nueva versión
                caches.open(serverVersion)
                    .then(cache => {
                        return cache.addAll(urlsToCache);
                    })
                    .then(() => {
                        // Actualizar la versión actual del cache
                        CACHE_NAME = serverVersion;
                        console.log('Service worker actualizado a la versión', serverVersion);
                    });
            }
        })
        .catch(error => {
            console.error('Error al comprobar la versión del servidor:', error);
        });
}

// Verificar la actualización cada 24 horas (ajusta según tus necesidades)
setInterval(checkForUpdate, 5 * 1000);
// setInterval(checkForUpdate, 24 * 60 * 60 * 1000);

/*
// Añadir un listener al evento updatefound
self.addEventListener('updatefound', () => {
    // Obtener el nuevo service worker
    const newSW = sw.installing;

    // Mostrar el loader
    document.querySelector('.loader-container').style.display = 'block';

    // Añadir un listener al evento statechange
    newSW.addEventListener('statechange', () => {
        // Comprobar el estado del nuevo service worker
        switch (newSW.state) {
            case 'installed':
                // El nuevo service worker está instalado, pero no activado
                // Podemos mostrar un mensaje para que el usuario recargue la página
                document.querySelector('.text').textContent = 'Nueva versión disponible. Recarga la página para actualizar.';
                break;
            case 'activated':
                // El nuevo service worker está activado
                // Podemos ocultar el loader
                document.querySelector('.loader-container').style.display = 'none';
                break;
        }
    });
});

// Comprobar si hay una nueva versión del service worker
sw.registration.update()
    .then(() => {
        // Si hay una nueva versión, se instalará y activará
        console.log('Service worker actualizado');
    })
    .catch(error => {
        // Si hay algún error, se mostrará en la consola
        console.error('Error al actualizar el service worker', error);
    });


// Añadir un listener personalizado para verificar actualizaciones
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'checkForUpdate') {
        // Comprobar si hay una nueva versión del service worker
        self.registration.update()
            .then(() => {
                // Si hay una nueva versión, se instalará y activará
                console.log('Service worker actualizado');
            })
            .catch(error => {
                // Si hay algún error, se mostrará en la consola
                console.error('Error al actualizar el service worker', error);
            });
    }
});
*/
