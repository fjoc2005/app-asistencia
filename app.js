// ===================================
// APP Asistencia - Main App Logic (Phase 3 - Simplified)
// RUT validation and photo-based attendance
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
        nombreCompleto: nombreCompleto, // Store full name
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

// Registration Form Logic
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registroForm');
    const rutInput = document.getElementById('rut');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const btnConfirmar = document.getElementById('btnConfirmar');
    const errorMessage = document.getElementById('errorMessage');

    if (!form) return;

    // Auto-focus RUT input for tablet
    setTimeout(() => {
        if (rutInput) {
            rutInput.focus();
        }
    }, 300);

    // Format RUT as user types
    if (rutInput) {
        rutInput.addEventListener('input', (e) => {
            const cursorPos = e.target.selectionStart;
            const oldValue = e.target.value;
            const newValue = formatRUT(oldValue);

            e.target.value = newValue;

            if (newValue.length > oldValue.length) {
                e.target.setSelectionRange(cursorPos + 1, cursorPos + 1);
            }
        });

        // Validate RUT on blur
        rutInput.addEventListener('blur', () => {
            const rut = rutInput.value;

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
        });
    }

    // Form submission - Start photo capture
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!currentUser) {
            showError('Error al validar usuario.');
            return;
        }

        // Hide form, show photo capture
        form.style.display = 'none';
        startPhotoCapture();
    });

    function showError(message) {
        if (errorMessage) {
            errorMessage.querySelector('span').textContent = message;
            errorMessage.style.display = 'flex';
            lucide.createIcons();
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    function showUserInfo(nombre) {
        if (userName && userInfo) {
            userName.textContent = nombre;
            userInfo.style.display = 'block';
            lucide.createIcons();
        }
    }

    function hideUserInfo() {
        if (userInfo) {
            userInfo.style.display = 'none';
        }
    }
});

// Photo Capture Functions
async function startPhotoCapture() {
    const photoCaptureSection = document.getElementById('photoCaptureSection');
    const video = document.getElementById('videoElement');
    const btnCapturePhoto = document.getElementById('btnCapturePhoto');

    photoCaptureSection.style.display = 'block';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });

        video.srcObject = stream;
        videoStream = stream;

        video.onloadedmetadata = () => {
            video.play();
        };

        lucide.createIcons();

    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('No se pudo acceder a la cámara. Verifica los permisos.');
        resetToHome();
    }

    // Capture photo button
    btnCapturePhoto.onclick = capturePhoto;
}

async function capturePhoto() {
    const video = document.getElementById('videoElement');
    const canvas = document.getElementById('photoCanvas');
    const btnCapturePhoto = document.getElementById('btnCapturePhoto');

    // Disable button during capture
    btnCapturePhoto.disabled = true;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
        // Stop video stream
        stopCamera();

        // Upload photo
        await uploadPhoto(blob);

    }, 'image/jpeg', 0.9);
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

async function uploadPhoto(photoBlob) {
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const uploadStatus = document.getElementById('uploadStatus');

    uploadProgress.style.display = 'block';

    try {
        // Update progress
        progressFill.style.width = '30%';
        uploadStatus.textContent = 'Subiendo fotografía a Drive...';

        // Upload to Google Drive
        const result = await uploadPhotoToDrive(photoBlob, currentUser.rut, (progress) => {
            progressFill.style.width = progress + '%';
        });

        let photoURL = null;
        const nombreCompleto = `${currentUser.nombres || currentUser.nombre || ''} ${currentUser.apellidoPaterno || ''} ${currentUser.apellidoMaterno || ''}`.trim();

        if (result.success) {
            uploadStatus.textContent = 'Fotografía subida exitosamente';
            photoURL = result.fileId ? `https://drive.google.com/file/d/${result.fileId}/view` : 'local';
        } else {
            // Fallback to local storage
            uploadStatus.textContent = 'Guardando fotografía localmente...';
            const localResult = savePhotoLocally(photoBlob, currentUser.rut);
            photoURL = 'local';
        }

        // Save attendance
        const asistencia = saveAsistencia(currentUser.rut, nombreCompleto, photoURL);

        // Show success and redirect
        showSuccessAndRedirect(nombreCompleto, asistencia.hora);

    } catch (error) {
        console.error('Error uploading photo:', error);

        // Fallback to local
        const localResult = savePhotoLocally(photoBlob, currentUser.rut);
        const nombreCompleto = `${currentUser.nombres || currentUser.nombre || ''} ${currentUser.apellidoPaterno || ''} ${currentUser.apellidoMaterno || ''}`.trim();
        const asistencia = saveAsistencia(currentUser.rut, nombreCompleto, 'local');

        showSuccessAndRedirect(nombreCompleto, asistencia.hora);
    }
}

function showSuccessAndRedirect(nombre, hora) {
    const modal = document.getElementById('successModal');
    const message = document.getElementById('successMessage');

    message.textContent = `${nombre}, tu asistencia ha sido registrada a las ${hora}`;
    modal.style.display = 'flex';

    lucide.createIcons();
    createConfetti();

    // Auto-redirect after 3 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
}

function resetToHome() {
    window.location.href = 'index.html';
}

// Confetti animation
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
