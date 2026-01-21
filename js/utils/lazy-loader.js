/**
 * Lazy Loader Utility - APP Asistencia
 * Carga módulos bajo demanda para mejorar rendimiento inicial
 */

class LazyLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * Carga un script de forma dinámica
     * @param {string} src - URL del script
     * @param {string} id - ID único del módulo
     * @returns {Promise} - Promesa que se resuelve cuando el script carga
     */
    async loadScript(src, id) {
        // Si ya está cargado, retornar inmediatamente
        if (this.loadedModules.has(id)) {
            return Promise.resolve();
        }

        // Si ya está cargando, retornar la promesa existente
        if (this.loadingPromises.has(id)) {
            return this.loadingPromises.get(id);
        }

        // Crear nueva promesa de carga
        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${src}?v=${new Date().getTime()}`;
            script.id = id;

            script.onload = () => {
                this.loadedModules.add(id);
                this.loadingPromises.delete(id);
                console.log(`[LazyLoader] Módulo cargado: ${id}`);
                resolve();
            };

            script.onerror = () => {
                this.loadingPromises.delete(id);
                console.error(`[LazyLoader] Error cargando: ${id}`);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });

        this.loadingPromises.set(id, loadPromise);
        return loadPromise;
    }

    /**
     * Carga múltiples scripts en paralelo
     * @param {Array} scripts - Array de objetos {src, id}
     * @returns {Promise} - Promesa que se resuelve cuando todos cargan
     */
    async loadScripts(scripts) {
        return Promise.all(
            scripts.map(({ src, id }) => this.loadScript(src, id))
        );
    }

    /**
     * Verifica si un módulo está cargado
     * @param {string} id - ID del módulo
     * @returns {boolean}
     */
    isLoaded(id) {
        return this.loadedModules.has(id);
    }

    /**
     * Pre-carga módulos en segundo plano (sin bloquear)
     * @param {Array} scripts - Array de objetos {src, id}
     */
    preload(scripts) {
        // Esperar a que el navegador esté idle
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.loadScripts(scripts).catch(console.error);
            });
        } else {
            setTimeout(() => {
                this.loadScripts(scripts).catch(console.error);
            }, 2000);
        }
    }
}

// Instancia global
const lazyLoader = new LazyLoader();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoader;
}
