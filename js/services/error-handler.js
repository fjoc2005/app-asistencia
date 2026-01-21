/**
 * Error Handler Service - APP Asistencia
 * Manejo centralizado de errores con mensajes user-friendly
 */

class ErrorHandler {
    static errorCodes = {
        'NetworkError': { message: 'Sin conexión a internet', icon: 'wifi-off' },
        'QuotaExceededError': { message: 'Espacio de almacenamiento lleno', icon: 'hard-drive' },
        '401': { message: 'Sesión expirada, por favor inicia sesión nuevamente', icon: 'lock' },
        '403': { message: 'No tienes permisos para realizar esta acción', icon: 'shield-alert' },
        '429': { message: 'Demasiadas solicitudes, intenta en unos minutos', icon: 'clock' },
        '500': { message: 'Error del servidor, intenta más tarde', icon: 'server' },
        'DRIVE_QUOTA': { message: 'Cuota de Google Drive excedida', icon: 'cloud-off' }
    };

    static show(error, context = '', showModal = true) {
        const userMessage = this.getUserFriendlyMessage(error);
        const errorCode = `ERR-${Date.now().toString(36).toUpperCase()}`;
        const icon = this.getErrorIcon(error);

        // Log para debugging
        console.error(`[${errorCode}] ${context}:`, error);

        if (showModal && typeof showResultModal === 'function') {
            showResultModal('error', 'Error',
                `${userMessage}\n\nCódigo: ${errorCode}\nSi el problema persiste, contacta al administrador.`,
                false
            );
        }

        return { errorCode, userMessage, icon };
    }

    static getUserFriendlyMessage(error) {
        // Buscar por nombre de error
        if (error.name && this.errorCodes[error.name]) {
            return this.errorCodes[error.name].message;
        }

        // Buscar por código de estado HTTP
        if (error.status && this.errorCodes[error.status.toString()]) {
            return this.errorCodes[error.status.toString()].message;
        }

        // Buscar por código personalizado
        if (error.code && this.errorCodes[error.code]) {
            return this.errorCodes[error.code].message;
        }

        // Mensaje por defecto
        return error.message || 'Ha ocurrido un error inesperado';
    }

    static getErrorIcon(error) {
        if (error.name && this.errorCodes[error.name]) {
            return this.errorCodes[error.name].icon;
        }
        if (error.status && this.errorCodes[error.status.toString()]) {
            return this.errorCodes[error.status.toString()].icon;
        }
        return 'alert-circle';
    }

    /**
     * Ejecuta una función con reintentos exponenciales
     * @param {Function} fn - Función async a ejecutar
     * @param {Object} options - Opciones de reintento
     * @returns {Promise} - Resultado de la función
     */
    static async executeWithRetry(fn, options = {}) {
        const {
            maxRetries = 3,
            initialDelay = 1000,
            maxDelay = 10000,
            backoffMultiplier = 2,
            retryableErrors = [429, 500, 503, 'NetworkError']
        } = options;

        let lastError;
        let delay = initialDelay;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                // Verificar si el error es reintentable
                const isRetryable = retryableErrors.some(code =>
                    error.status === code ||
                    error.name === code ||
                    error.code === code
                );

                if (!isRetryable || attempt === maxRetries) {
                    throw error;
                }

                // Esperar antes de reintentar
                console.warn(`Intento ${attempt + 1}/${maxRetries} falló. Reintentando en ${delay}ms...`);
                await this.sleep(delay);

                // Incrementar delay exponencialmente
                delay = Math.min(delay * backoffMultiplier, maxDelay);
            }
        }

        throw lastError;
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wrapper para operaciones de Google Drive con manejo de errores
     */
    static async driveOperation(operation, context = 'Operación Drive') {
        try {
            return await this.executeWithRetry(operation, {
                maxRetries: 3,
                retryableErrors: [429, 500, 503, 'NetworkError']
            });
        } catch (error) {
            // Transformar errores de Drive a códigos conocidos
            if (error.status === 403 && error.message?.includes('quota')) {
                error.code = 'DRIVE_QUOTA';
            }

            this.show(error, context);
            throw error;
        }
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
