/**
 * Version Control Utility - APP Asistencia
 * Forces cache clearing and hard reload on version mismatch
 */

const APP_VERSION = '3.0.5'; // Incremented to v3.0.4

(function () {
    console.log('Verificando versión de la aplicación: ' + APP_VERSION);

    const lastVersion = localStorage.getItem('app_version');

    if (lastVersion !== APP_VERSION) {
        console.warn('Nueva versión detectada. Limpiando caché...');

        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(function (names) {
                for (let name of names) {
                    caches.delete(name);
                }
            });
        }

        // Clear old version flag
        localStorage.setItem('app_version', APP_VERSION);

        // Hard reload
        const currentUrl = window.location.href.split('?')[0];
        window.location.replace(currentUrl + '?v=' + APP_VERSION);
    }
})();
