/**
 * Voice Assistant for APP Asistencia
 * Provides voice recognition and command processing
 */

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentField = null;
        this.formData = {
            nombres: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            telefono: '',
            rut: ''
        };

        this.initRecognition();
    }

    initRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-CL';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Error de reconocimiento de voz:', event.error);
                this.updateStatus('Error: ' + event.error);
                this.isListening = false;
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateButtonState();
            };
        } else {
            console.warn('Reconocimiento de voz no soportado en este navegador');
        }
    }

    start() {
        if (!this.recognition) {
            alert('El reconocimiento de voz no está disponible en tu navegador');
            return;
        }

        if (this.isListening) {
            this.stop();
            return;
        }

        this.isListening = true;
        this.updateButtonState();
        this.updateStatus('Escuchando...');
        this.recognition.start();
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.updateButtonState();
            this.updateStatus('Detenido');
        }
    }

    processCommand(transcript) {
        this.updateTranscript(transcript);

        // Comandos de control
        if (transcript.includes('guardar')) {
            this.saveForm();
            return;
        }

        if (transcript.includes('cancelar')) {
            this.cancelForm();
            return;
        }

        // Comandos de campo
        if (transcript.includes('nombre')) {
            const nombre = this.extractValue(transcript, 'nombre');
            if (nombre) {
                this.formData.nombres = nombre;
                this.updateFormField('voiceNombres', nombre);
                this.speak('Nombre registrado: ' + nombre);
            }
        }

        if (transcript.includes('apellido paterno')) {
            const apellido = this.extractValue(transcript, 'apellido paterno');
            if (apellido) {
                this.formData.apellidoPaterno = apellido;
                this.updateFormField('voiceApellidoPaterno', apellido);
                this.speak('Apellido paterno registrado: ' + apellido);
            }
        }

        if (transcript.includes('apellido materno')) {
            const apellido = this.extractValue(transcript, 'apellido materno');
            if (apellido) {
                this.formData.apellidoMaterno = apellido;
                this.updateFormField('voiceApellidoMaterno', apellido);
                this.speak('Apellido materno registrado: ' + apellido);
            }
        }

        if (transcript.includes('teléfono') || transcript.includes('telefono')) {
            const telefono = this.extractNumbers(transcript);
            if (telefono) {
                this.formData.telefono = telefono;
                this.updateFormField('voiceTelefono', telefono);
                this.speak('Teléfono registrado');
            }
        }

        if (transcript.includes('rut')) {
            const rut = this.extractRUT(transcript);
            if (rut) {
                this.formData.rut = rut;
                this.updateFormField('voiceRut', rut);
                this.speak('RUT registrado');
            }
        }
    }

    extractValue(transcript, keyword) {
        const parts = transcript.split(keyword);
        if (parts.length > 1) {
            return parts[1].trim().split(' ')[0];
        }
        return null;
    }

    extractNumbers(text) {
        const numbers = text.match(/\d+/g);
        return numbers ? numbers.join('') : null;
    }

    extractRUT(text) {
        // Extraer números y K del texto
        const cleaned = text.replace(/[^\dkK]/g, '');
        if (cleaned.length >= 8) {
            return this.formatRUT(cleaned);
        }
        return null;
    }

    formatRUT(rut) {
        // Formato: 12.345.678-9
        const cleaned = rut.replace(/[^\dkK]/g, '');
        if (cleaned.length < 2) return cleaned;

        const dv = cleaned.slice(-1);
        const numbers = cleaned.slice(0, -1);

        return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
    }

    updateFormField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('voiceStatus');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    updateTranscript(text) {
        const transcriptEl = document.getElementById('voiceTranscript');
        if (transcriptEl) {
            transcriptEl.textContent = text;
        }
    }

    updateButtonState() {
        const button = document.getElementById('startVoiceBtn');
        if (button) {
            if (this.isListening) {
                button.innerHTML = '<i data-lucide="mic-off"></i> Detener';
                button.classList.add('listening');
            } else {
                button.innerHTML = '<i data-lucide="mic"></i> Activar Asistente';
                button.classList.remove('listening');
            }
            lucide.createIcons();
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-CL';
            window.speechSynthesis.speak(utterance);
        }
    }

    saveForm() {
        // Validar que al menos tenga nombres y apellidos
        if (!this.formData.nombres || !this.formData.apellidoPaterno || !this.formData.apellidoMaterno) {
            this.speak('Faltan datos obligatorios');
            return;
        }

        // Crear objeto de socia
        const socia = {
            rut: this.formData.rut || '',
            nombres: this.formData.nombres,
            apellidoPaterno: this.formData.apellidoPaterno,
            apellidoMaterno: this.formData.apellidoMaterno,
            telefono: this.formData.telefono || '',
            // Campos adicionales con valores por defecto
            numReg: '',
            comuna: '',
            numRegAnt: '',
            fechaNacimiento: '',
            edad: '',
            estadoCivil: '',
            celular: this.formData.telefono || '',
            direccion: '',
            email: '',
            rbd: '',
            anoIngresoPae: '',
            hijosMenores: '',
            hijosMayores: '',
            empresa: '',
            estado: 'Activo'
        };

        // Guardar en localStorage
        const socias = JSON.parse(localStorage.getItem('usuarios') || '[]');
        socias.push(socia);
        localStorage.setItem('usuarios', JSON.stringify(socias));

        this.speak('Socia guardada exitosamente');
        this.resetForm();

        // Recargar tabla si existe
        if (typeof loadSocias === 'function') {
            loadSocias();
        }

        // Cerrar modal
        const modal = document.getElementById('voiceAssistantModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    cancelForm() {
        this.resetForm();
        this.speak('Formulario cancelado');
        const modal = document.getElementById('voiceAssistantModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    resetForm() {
        this.formData = {
            nombres: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            telefono: '',
            rut: ''
        };

        // Limpiar campos del formulario
        ['voiceNombres', 'voiceApellidoPaterno', 'voiceApellidoMaterno', 'voiceTelefono', 'voiceRut'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
    }
}

// Instancia global
let voiceAssistant = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    voiceAssistant = new VoiceAssistant();
});

// Funciones globales para usar en HTML
function startVoiceAssistant() {
    if (voiceAssistant) {
        voiceAssistant.start();
    }
}

function stopVoiceAssistant() {
    if (voiceAssistant) {
        voiceAssistant.stop();
    }
}

function showVoiceAssistantModal() {
    const modal = document.getElementById('voiceAssistantModal');
    if (modal) {
        modal.style.display = 'flex';
        if (voiceAssistant) {
            voiceAssistant.resetForm();
        }
    }
}

function closeVoiceAssistantModal() {
    const modal = document.getElementById('voiceAssistantModal');
    if (modal) {
        modal.style.display = 'none';
        if (voiceAssistant) {
            voiceAssistant.stop();
        }
    }
}
