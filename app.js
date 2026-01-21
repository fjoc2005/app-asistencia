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

function saveAsistencia(rut, nombreCompleto, photoURL = null, meetingId = null) {
    const asistencias = getAsistencias();
    const now = new Date();

    const asistencia = {
        fecha: now.toLocaleDateString('es-CL'),
        hora: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        rut: rut,
        nombreCompleto: nombreCompleto,
        photoURL: photoURL,
        meetingId: meetingId, // Link to meeting if exists
        timestamp: now.toISOString()
    };

    asistencias.push(asistencia);
    localStorage.setItem('asistencias', JSON.stringify(asistencias));

    // If linked to meeting, update meeting attendance matrix
    if (meetingId) {
        updateMeetingAttendance(meetingId, rut, 'Asistió', asistencia.hora);
    }

    return asistencia;
}

// Update meeting attendance matrix
function updateMeetingAttendance(meetingId, sociaRut, estado, hora) {
    const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);

    if (meeting) {
        if (!meeting.asistencias) {
            meeting.asistencias = {};
        }
        meeting.asistencias[sociaRut] = {
            estado: estado,
            hora: hora,
            justificacion: null
        };
        localStorage.setItem('meetings', JSON.stringify(meetings));
    }
}

function findUsuarioByRUT(rut) {
    const usuarios = getUsuarios();
    const cleanedRUT = cleanRUT(rut);
    return usuarios.find(u => cleanRUT(u.rut) === cleanedRUT);
}

// Global variables
let currentUser = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Only init if on registro page
    if (!document.getElementById('registroForm')) return;

    // Setup form listeners and numeric keypad
    setupFormListeners();
    setupNumericKeypad();
});

// Setup Numeric Keypad
function setupNumericKeypad() {
    const keypad = document.getElementById('numericKeypad');
    if (!keypad) return;

    const rutInput = document.getElementById('rut');

    keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.key-btn');
        if (!btn) return;

        const key = btn.getAttribute('data-key');
        let currentValue = rutInput.value.replace(/[^0-9kK]/g, ''); // Remove formatting

        if (key === 'delete') {
            // Remove last character
            currentValue = currentValue.slice(0, -1);
        } else if (currentValue.length < 9) {
            // Add digit or K (max 9 characters: 8 digits + 1 DV)
            currentValue += key;
        }

        // Format and display RUT
        rutInput.value = formatRUT(currentValue);

        // Validate and enable/disable confirm button
        validateAndShowUser(rutInput.value);

        // Recreate icons for delete button
        lucide.createIcons();
    });
}



// Form Listeners
function setupFormListeners() {
    const form = document.getElementById('registroForm');
    const btnConfirmar = document.getElementById('btnConfirmar');

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

        showResultModal('success', 'Socia registrada con éxito', `${nombreCompleto}, tu asistencia ha sido registrada a las ${asistencia.hora}`);
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
        showResultModal('error', 'Socia no registrada', 'El RUT ingresado no corresponde a una socia activa en el sistema.', false);
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

    // Reset classes
    const iconContainer = document.getElementById('resultIconContainer');
    iconContainer.className = '';

    if (type === 'success') {
        iconContainer.classList.add('success-icon');
        resultIcon.setAttribute('data-lucide', 'check-circle');
        redirectMsg.style.display = 'block';
        btnClose.style.display = 'none';

        if (redirect) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
        createConfetti();
    } else {
        iconContainer.classList.add('error-icon'); // Will need CSS for this
        resultIcon.setAttribute('data-lucide', 'x-circle');
        redirectMsg.style.display = 'none';
        btnClose.style.display = 'block'; // Show close button for errors

        // Ensure error styling is applied (can add inline or class)
        iconContainer.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    }

    modal.style.display = 'flex';
    lucide.createIcons();
}

function closeResultModal() {
    document.getElementById('resultModal').style.display = 'none';
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
