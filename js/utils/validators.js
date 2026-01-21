/**
 * Validators Utility - APP Asistencia
 * Funciones de validación reutilizables
 */

// Validación de RUT chileno
function validateRUT(rut) {
    if (!rut || typeof rut !== 'string') return false;

    const cleaned = cleanRUT(rut);
    if (!/^\d{7,8}[0-9Kk]$/.test(cleaned)) return false;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();

    return dv === calculatedDV;
}

// Limpiar RUT (quitar puntos y guiones)
function cleanRUT(rut) {
    if (!rut) return '';
    return rut.toString().replace(/[.-]/g, '').trim().toUpperCase();
}

// Formatear RUT (agregar puntos y guión)
function formatRUT(rut) {
    const cleaned = cleanRUT(rut);
    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    // Agregar puntos cada 3 dígitos
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
}

// Validación de email
function validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validación de fecha (formato YYYY-MM-DD)
function validateDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Validación de teléfono chileno
function validatePhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    // Acepta +56 9 XXXX XXXX o 9 XXXX XXXX
    return /^(56)?9\d{8}$/.test(cleaned);
}

// Validación de campo requerido
function validateRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

// Validación de longitud mínima
function validateMinLength(value, minLength) {
    if (!value) return false;
    return value.toString().length >= minLength;
}

// Validación de longitud máxima
function validateMaxLength(value, maxLength) {
    if (!value) return true; // Permitir vacío
    return value.toString().length <= maxLength;
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateRUT,
        cleanRUT,
        formatRUT,
        validateEmail,
        validateDate,
        validatePhone,
        validateRequired,
        validateMinLength,
        validateMaxLength
    };
}
