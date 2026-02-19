// ===================================
// APP Asistencia v3 - Registro de Asistencia
// Firebase Realtime Database + QR Scanning
// ===================================

// RUT Validation Functions
function cleanRUT(rut) {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

function formatRUT(rut) {
    const cleaned = cleanRUT(rut);
    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    let formatted = '';
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
        if (j > 0 && j % 3 === 0) formatted = '.' + formatted;
        formatted = body[i] + formatted;
    }

    return formatted + '-' + dv;
}

function calculateDV(rut) {
    const cleaned = cleanRUT(rut);
    const body = cleaned.slice(0, -1);

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const dv = 11 - remainder;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
}

function validateRUT(rut) {
    const cleaned = cleanRUT(rut);
    if (cleaned.length < 2) return false;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    return calculateDV(body + dv) === dv;
}

// QR Processing
function extractRUTFromQR(qrContent) {
    console.log('QR Content:', qrContent);

    if (/^\d{6,9}[0-9kK]?$/.test(qrContent.trim())) {
        return qrContent.trim();
    }

    try {
        const data = JSON.parse(qrContent);
        return data.rut || data.run || data.RUT || data.RUN || null;
    } catch (e) {}

    const rutPattern = /(\d{1,2}\.\d{3}\.\d{3}-[0-9kK]|\d{6,9}[0-9kK]?)/i;
    const match = qrContent.match(rutPattern);

    if (match) {
        return match[0];
    }

    const numberPattern = /\d{6,9}[0-9kK]/gi;
    const numbers = qrContent.match(numberPattern);

    if (numbers && numbers.length > 0) {
        return numbers[0];
    }

    return null;
}

// Local Storage Functions
function getUsuarios() {
    const usuarios = localStorage.getItem('usuarios');
    return usuarios ? JSON.parse(usuarios) : [];
}

function getAsambleas() {
    const asambleas = localStorage.getItem('asambleas');
    return asambleas ? JSON.parse(asambleas) : [];
}

function findUsuarioByRUT(rut) {
    const usuarios = getUsuarios();
    const cleanedRUT = cleanRUT(rut);
    return usuarios.find(u => cleanRUT(u.rut) === cleanedRUT);
}

// Global variables
let currentUser = null;
let currentAsambleaId = null;
let qrScanner = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('registroForm')) return;

    initializeQRScanner();
    setupFormListeners();

    // Check if we're coming from access token
    const urlParams = new URLSearchParams(window.location.search);
    const asambleaId = urlParams.get('asambleaId');
    if (asambleaId) {
        currentAsambleaId = asambleaId;
    }
});

// QR Scanner Setup
function initializeQRScanner() {
    const qrReaderDiv = document.getElementById('qr-reader');
    if (!qrReaderDiv) return;

    if (typeof Html5Qrcode === 'undefined') {
        console.warn('Html5Qrcode library not loaded');
        return;
    }

    qrScanner = new Html5Qrcode('qr-reader');

    qrScanner.start(
        { facingMode: 'environment' },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onQRCodeScanned,
        onQRCodeError
    );

    window.addEventListener('beforeunload', () => {
        if (qrScanner && qrScanner.isScanning) {
            qrScanner.stop();
        }
    });
}

function onQRCodeScanned(decodedText) {
    console.log('QR escaneado:', decodedText);

    const extractedRUT = extractRUTFromQR(decodedText);

    if (!extractedRUT) {
        showError('Código QR no válido. Intenta de nuevo.');
        return;
    }

    const rutInput = document.getElementById('rut');
    rutInput.value = formatRUT(extractedRUT);

    validateAndShowUser(rutInput.value);
}

function onQRCodeError(error) {
    if (error && error.includes && !error.includes('NotAllowedError')) {
        console.debug('QR Error:', error);
    }
}

// Form Setup
function setupFormListeners() {
    const form = document.getElementById('registroForm');
    const rutInput = document.getElementById('rut');

    rutInput.addEventListener('input', (e) => {
        const value = e.target.value;
        e.target.value = formatRUT(value);
        validateAndShowUser(e.target.value);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showError('Error al validar usuario.');
            return;
        }

        const nombreCompleto = `${currentUser.nombres || currentUser.nombre || ''} ${currentUser.apellidoPaterno || ''} ${currentUser.apellidoMaterno || ''}`.trim();
        const timestamp = new Date().toISOString();

        try {
            // Guardar en Firebase
            if (currentAsambleaId) {
                await saveAsistencia(currentAsambleaId, currentUser.rut, nombreCompleto, timestamp);
            } else {
                // Guardar en localStorage si no hay asamblea específica
                const asistencias = JSON.parse(localStorage.getItem('asistencias') || '[]');
                asistencias.push({
                    fecha: new Date().toLocaleDateString('es-CL'),
                    hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                    rut: currentUser.rut,
                    nombreCompleto: nombreCompleto,
                    timestamp: timestamp
                });
                localStorage.setItem('asistencias', JSON.stringify(asistencias));
            }

            showResultModal('success', 'Asistencia Registrada', `${nombreCompleto}, tu asistencia ha sido registrada correctamente`);
        } catch (error) {
            console.error('Error registrando asistencia:', error);
            showResultModal('error', 'Error', 'Hubo un problema al registrar tu asistencia. Intenta de nuevo.', false);
        }
    });
}

// Validation
function validateAndShowUser(rut) {
    const btnConfirmar = document.getElementById('btnConfirmar');

    if (!rut) {
        hideError();
        hideUserInfo();
        btnConfirmar.disabled = true;
        return;
    }

    if (!validateRUT(rut)) {
        showError('RUT inválido. Verifica el formato y dígito verificador.');
        hideUserInfo();
        btnConfirmar.disabled = true;
        return;
    }

    const usuario = findUsuarioByRUT(rut);

    if (!usuario) {
        showResultModal('error', 'Socia No Registrada', 'El RUT ingresado no está registrado en el sistema.', false);
        hideUserInfo();
        btnConfirmar.disabled = true;
        return;
    }

    if (usuario.estado !== 'Activo') {
        showError('Usuario inactivo. Contacta al administrador.');
        hideUserInfo();
        btnConfirmar.disabled = true;
        return;
    }

    hideError();
    currentUser = usuario;
    const nombreCompleto = `${usuario.nombres || usuario.nombre || ''} ${usuario.apellidoPaterno || ''} ${usuario.apellidoMaterno || ''}`.trim();
    showUserInfo(nombreCompleto);
    btnConfirmar.disabled = false;
}

// UI Helpers
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.style.display = 'flex';
        lucide.createIcons();
    }
}

function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

function showUserInfo(nombre) {
    const userName = document.getElementById('userName');
    const userInfo = document.getElementById('userInfo');
    if (userName && userInfo) {
        userName.textContent = nombre;
        userInfo.style.display = 'block';
        lucide.createIcons();
    }
}

function hideUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'none';
    }
}

function showResultModal(type, title, messageText, redirect = true) {
    const modal = document.getElementById('resultModal');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const redirectMsg = document.getElementById('redirectMessage');
    const btnClose = document.getElementById('btnCloseModal');

    resultTitle.textContent = title;
    resultMessage.textContent = messageText;

    const iconContainer = document.getElementById('resultIconContainer');
    iconContainer.className = '';

    if (type === 'success') {
        iconContainer.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        resultIcon.setAttribute('data-lucide', 'check-circle');
        redirectMsg.style.display = 'block';
        btnClose.style.display = 'none';

        if (redirect) {
            let countdown = 3;
            const countdownEl = document.getElementById('countdown');
            const interval = setInterval(() => {
                countdown--;
                countdownEl.textContent = countdown;
                if (countdown === 0) {
                    clearInterval(interval);
                    window.location.href = 'index.html';
                }
            }, 1000);
        }

        createConfetti();
    } else {
        iconContainer.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        resultIcon.setAttribute('data-lucide', 'x-circle');
        redirectMsg.style.display = 'none';
        btnClose.style.display = 'block';
    }

    modal.style.display = 'flex';
    lucide.createIcons();
}

function closeResultModal() {
    document.getElementById('resultModal').style.display = 'none';
}

function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#10B981', '#F59E0B', '#EC4899'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.opacity = '1';
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.animation = `confetti ${2 + Math.random() * 2}s ease-out forwards`;

        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
}
