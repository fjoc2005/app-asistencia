// ===================================
// APP Asistencia - Main App Logic (Modernized with QR)
// RUT validation, QR scanning, and photo-based attendance
// ===================================

// RUT Validation Functions
function cleanRUT(rut) {
    return rut.replace(/[^0-9kK]/g, '');
}

function formatRUT(rut) {
    const cleaned = cleanRUT(rut);
    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();

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
    const dv = cleaned.slice(-1).toUpperCase();

    return calculateDV(body + dv) === dv;
}

// Local Storage Functions
function getUsuarios() {
    const usuarios = localStorage.getItem('usuarios');
    return usuarios ? JSON.parse(usuarios) : [];
}

function getAsistencias() {
    const asistencias = localStorage.getItem('asistencias');
    return asistencias ? JSON.parse(asistencias) : [];
}

function saveAsistencia(rut, nombreCompleto, photoURL = null) {
    const asistencias = getAsistencias();
    const now = new Date();

    const asistencia = {
        fecha: now.toLocaleDateString('es-CL'),
        hora: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        rut: rut,
        nombreCompleto: nombreCompleto,
        photoURL: photoURL,
        timestamp: now.toISOString()
    };

    asistencias.push(asistencia);
    localStorage.setItem('asistencias', JSON.stringify(asistencias));

    return asistencia;
}

function findUsuarioByRUT(rut) {
    const usuarios = getUsuarios();
    const cleanedRUT = cleanRUT(rut);
    return usuarios.find(u => cleanRUT(u.rut) === cleanedRUT);
}

// Global variables
let currentUser = null;
let videoStream = null;
let html5QrcodeScanner = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Only init if on registro page
    if (!document.getElementById('registroForm')) return;

    // Initialize QR Scanner
    initQRScanner();

    // Setup manual form listeners
    setupFormListeners();

    // Default to Scan mode
    switchMode('scan');
});

// Mode Switching
window.switchMode = function (mode) {
    const scanSection = document.getElementById('scanSection');
    const formSection = document.getElementById('registroForm');
    const btnScan = document.getElementById('btnModeScan');
    const btnManual = document.getElementById('btnModeManual');
    const headerText = document.getElementById('headerText');

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));

    if (mode === 'scan') {
        scanSection.style.display = 'block';
        formSection.style.display = 'none';
        btnScan.classList.add('active');
        headerText.textContent = 'Apunte el código QR de su carnet';
        startQRCamera();
    } else {
        scanSection.style.display = 'none';
        formSection.style.display = 'block';
        btnManual.classList.add('active');
        headerText.textContent = 'Ingrese su RUT manualmente';
        stopQRCamera();
        setTimeout(() => document.getElementById('rut')?.focus(), 300);
    }
}

// QR Scanner Logic
function initQRScanner() {
    // Only init object, don't start yet
    // html5QrcodeScanner will be managed by start/stop functions
}

function startQRCamera() {
    if (html5QrcodeScanner) return; // Already running

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner = new Html5Qrcode("reader");

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess
    ).catch(err => {
        console.error("Error starting QR scanner", err);
        document.getElementById('reader').innerHTML =
            '<p class="error-msg">No se pudo iniciar la cámara. Use el modo manual.</p>';
    });
}

function stopQRCamera() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error("Failed to stop scanner", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Check if it's a URL (Chilean ID QR usually contains a URL)
    // Example: https://portal.sidiv.registrocivil.cl/docstatus?run=12345678-9&type=...
    console.log(`Scan result: ${decodedText}`);

    let rut = null;

    // Try to extract RUN/RUT from URL parameters
    try {
        const url = new URL(decodedText);
        const params = new URLSearchParams(url.search);

        if (params.has('run')) {
            rut = params.get('run');
        } else if (params.has('RUN')) {
            rut = params.get('RUN');
        }
    } catch (e) {
        // Not a URL, maybe raw text?
        // Check if text looks like a RUT
        if (validateRUT(decodedText)) {
            rut = decodedText;
        }
    }

    if (rut) {
        // Stop scanning
        stopQRCamera();

        // Fill form and validate
        const rutInput = document.getElementById('rut');
        rutInput.value = formatRUT(rut);

        // Switch to manual view to show user the result
        switchMode('manual');

        // Trigger validation logic
        const event = new Event('blur');
        rutInput.dispatchEvent(event);

        playSuccessSound();
    } else {
        console.log("No valid RUT found in QR");
    }
}

function playSuccessSound() {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
}

// Form Listeners
function setupFormListeners() {
    const form = document.getElementById('registroForm');
    const rutInput = document.getElementById('rut');
    const btnConfirmar = document.getElementById('btnConfirmar');
    const btnK = document.getElementById('btnK');

    // Format RUT as user types
    rutInput.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        let oldValue = e.target.value;

        if (oldValue.includes('#')) {
            oldValue = oldValue.replace(/#/g, 'k');
        }

        const newValue = formatRUT(oldValue);
        e.target.value = newValue;

        if (newValue.length > oldValue.length) {
            e.target.setSelectionRange(cursorPos + 1, cursorPos + 1);
        }
    });

    // Validate RUT on blur
    rutInput.addEventListener('blur', () => {
        validateAndShowUser(rutInput.value);
    });

    // "K" Button Logic
    if (btnK) {
        btnK.addEventListener('click', () => {
            const startPos = rutInput.selectionStart;
            const endPos = rutInput.selectionEnd;
            const currentValue = rutInput.value;
            const newValue = currentValue.substring(0, startPos) + 'k' + currentValue.substring(endPos);
            rutInput.value = newValue;

            const event = new Event('input', { bubbles: true });
            rutInput.dispatchEvent(event);
            rutInput.focus();
        });
    }

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showError('Error al validar usuario.');
            return;
        }
        form.style.display = 'none';

        // Direct attendance confirmation - No Photo
        const nombreCompleto = `${currentUser.nombres || currentUser.nombre || ''} ${currentUser.apellidoPaterno || ''} ${currentUser.apellidoMaterno || ''}`.trim();
        const asistencia = saveAsistencia(currentUser.rut, nombreCompleto, null);

        if (window.driveIntegration) {
            window.driveIntegration.syncData().catch(console.error);
        }

        showSuccessAndRedirect(nombreCompleto, asistencia.hora);
    });
}

function validateAndShowUser(rut) {
    const btnConfirmar = document.getElementById('btnConfirmar');

    if (!rut) {
        hideError();
        hideUserInfo();
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
        showError('Usuario no encontrado. Contacta al administrador.');
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



function showSuccessAndRedirect(nombre, hora) {
    const modal = document.getElementById('successModal');
    const message = document.getElementById('successMessage');

    message.textContent = `${nombre}, tu asistencia ha sido registrada a las ${hora}`;
    modal.style.display = 'flex';

    lucide.createIcons();
    createConfetti();

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
}

function resetToHome() {
    window.location.href = 'index.html';
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
