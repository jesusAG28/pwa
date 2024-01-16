let deferredPrompt;

// Comprobar si el navegador soporta service workers y notificaciones
if ('serviceWorker' in navigator && 'Notification' in window) {

    // Registrar el service worker
    navigator.serviceWorker.register('sw.js')
        .then(function (registration) {
            console.log('Service worker registrado con éxito:', registration);

            // Enviar un mensaje al service worker para comprobar actualizaciones
            registration.active.postMessage({ type: 'checkForUpdate' });

            // Verificar si la PWA ya está instalada
            if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
                // PWA ya instalada
                console.log('La PWA ya está instalada.');
            } else {
                // PWA no instalada, mostrar botón de instalación
                document.getElementById('installButton').style.display = 'block';
            }
        })
        .catch(function (error) {
            console.log('Error al registrar el service worker:', error);
        });

    // Manejar el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (event) => {
        // Prevenir que el navegador muestre el banner de instalación por defecto
        event.preventDefault();

        // Guardar el evento para usarlo más tarde
        deferredPrompt = event;

        // Mostrar el botón de instalación
        document.getElementById('installButton').style.display = 'block';
    });

    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'reload') {
            // alert('Service Worker se ha actualizado. Recargando la página...');
            // window.location.reload(true);
            updateView();
        }
    });

    // Obtener el botón de suscripción
    var subscribeButton = document.getElementById('subscribe');

    // Comprobar si el usuario ya está suscrito
    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function (subscription) {
                if (subscription) {
                    // El usuario está suscrito
                    subscribeButton.textContent = 'Cancelar suscripción';
                    subscribeButton.disabled = false;
                } else {
                    // El usuario no está suscrito
                    subscribeButton.textContent = 'Suscribirse a las notificaciones';
                    subscribeButton.disabled = false;
                }
            });
    });

    // Añadir un evento al botón de suscripción
    subscribeButton.addEventListener('click', function () {
        // Si el usuario está suscrito, cancelar la suscripción
        if (subscribeButton.textContent === 'Cancelar suscripción') {
            unsubscribe();
        } else {
            // Si el usuario no está suscrito, solicitar el permiso y la suscripción
            subscribe();
        }
    });

    // Función para solicitar el permiso y la suscripción
    function subscribe() {
        // Solicitar el permiso para enviar notificaciones
        Notification.requestPermission(function (result) {
            if (result === 'granted') {
                // Si el permiso es concedido, obtener el service worker
                navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
                    // Crear una suscripción al servidor de notificaciones
                    serviceWorkerRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                    })
                        .then(function (subscription) {
                            // Si la suscripción es exitosa, cambiar el texto del botón
                            subscribeButton.textContent = 'Cancelar suscripción';
                            console.log('Usuario suscrito:', subscription.endpoint);
                        })
                        .catch(function (error) {
                            // Si la suscripción falla, mostrar un mensaje de error
                            console.log('Error al suscribir el usuario:', error);
                            alert('No se ha podido suscribir el usuario.');
                        });
                });
            } else {
                // Si el permiso es denegado, mostrar un mensaje de alerta
                alert('No se ha concedido el permiso para enviar notificaciones.');
            }
        });
    }

    // Función para cancelar la suscripción
    function unsubscribe() {
        // Obtener el service worker
        navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
            // Obtener la suscripción actual
            serviceWorkerRegistration.pushManager.getSubscription()
                .then(function (subscription) {
                    // Si el usuario está suscrito, cancelar la suscripción
                    if (subscription) {
                        subscription.unsubscribe()
                            .then(function () {
                                // Si la cancelación es exitosa, cambiar el texto del botón
                                subscribeButton.textContent = 'Suscribirse a las notificaciones';
                                console.log('Usuario cancelado:', subscription.endpoint);
                            })
                            .catch(function (error) {
                                // Si la cancelación falla, mostrar un mensaje de error
                                console.log('Error al cancelar el usuario:', error);
                                alert('No se ha podido cancelar el usuario.');
                            });
                    }
                });
        });
    }

    // Obtener el botón de notificación
    var notifyButton = document.getElementById('notify');

    // Añadir un evento al botón de notificación
    notifyButton.addEventListener('click', function () {
        // Crear el contenido de la notificación
        var title = 'PWA con notificaciones y CTA';
        var options = {
            body: 'Esta es una notificación de prueba',
            icon: 'icon.png',
            badge: 'badge.png',
            actions: [
                { action: 'open', title: 'Abrir la PWA' },
                { action: 'close', title: 'Cerrar la notificación' }
            ]
        };

        // Enviar la notificación al service worker
        navigator.serviceWorker.ready.then(function (registration) {
            registration.showNotification(title, options);
        });
    });

} else {
    // Si el navegador no soporta service workers o notificaciones, mostrar un mensaje de alerta
    alert('Tu navegador no soporta las notificaciones o los service workers.');
}


// Añadir un evento al botón de instalación
var installButton = document.getElementById('installButton');
if (installButton) {
    installButton.addEventListener('click', function () {
        // Mostrar el banner de instalación
        deferredPrompt.prompt();

        // Esperar a que el usuario responda
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuario aceptó la instalación');
            } else {
                console.log('Usuario rechazó la instalación');
            }

            // Limpiar la referencia al evento de instalación
            deferredPrompt = null;
        });
    });
}


function updateView() {
    var counter = 3;
    var interval = setInterval(function () {
        counter--;
        console.log(counter);

        if (counter === 0) {
            clearInterval(interval);
            window.location.reload(true);
        }
    }, 1000);

    caches.keys().then(cacheNames => {
        let latestCacheName = '';
        let latestTimestamp = 0;

        cacheNames.forEach(cacheName => {
            // Extraer el timestamp del nombre de la caché
            const match = cacheName.match(/^v(\d+\.\d+)-\d+$/);
            if (match) {
                const timestamp = parseFloat(match[1]);
                if (timestamp > latestTimestamp) {
                    latestTimestamp = timestamp;
                    latestCacheName = cacheName;
                }
            }
        });

        return Promise.all(
            cacheNames.filter(cacheName => {
                // Filtrar las cachés que no son la más reciente
                return cacheName !== latestCacheName;
            }).map(cacheName => {
                // Borrar las cachés no deseadas
                return caches.delete(cacheName);
            })
        );
    }).then(() => {
        console.log('Caches antiguas eliminadas. Manteniendo la más reciente.');
    });

    localStorage.clear();
    sessionStorage.clear();
}

