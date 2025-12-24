// ===================================
// APP Asistencia - Admin Panel Logic (Phase 4 - Reorganized)
// Consolidated attendance control and member roster
// ===================================

// Admin credentials
const ADMIN_CREDENTIALS = {
    email: 'administracion@gmail.com',
    password: 'demo123'
};

// Check if on login page
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminEmail', email);
            window.location.href = 'admin.html';
        } else {
            showError('Credenciales incorrectas. Verifica tu correo y contraseña.');
        }
    });

    function showError(message) {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.style.display = 'flex';
        lucide.createIcons();
    }
}

// Check if on admin page
if (document.querySelector('.admin-page')) {
    if (!sessionStorage.getItem('adminLoggedIn')) {
        window.location.href = 'admin-login.html';
    }

    const adminEmail = sessionStorage.getItem('adminEmail');
    if (adminEmail) {
        document.getElementById('adminEmail').textContent = adminEmail;
    }

    initializeDashboard();
    loadSocias();
    loadMeetings();
    loadAttendanceMatrix();
    loadDescuentos();
    setupEventListeners();
}

// Local Storage Functions
function getSocias() {
    const socias = localStorage.getItem('usuarios');
    return socias ? JSON.parse(socias) : [];
}

function saveSocia(socia) {
    const socias = getSocias();
    socias.push(socia);
    localStorage.setItem('usuarios', JSON.stringify(socias));
}

function deleteSocia(rut) {
    let socias = getSocias();
    socias = socias.filter(s => cleanRUT(s.rut) !== cleanRUT(rut));
    localStorage.setItem('usuarios', JSON.stringify(socias));
}

function getMeetings() {
    const meetings = localStorage.getItem('meetings');
    return meetings ? JSON.parse(meetings) : [];
}

function saveMeeting(meeting) {
    const meetings = getMeetings();
    meetings.push(meeting);
    localStorage.setItem('meetings', JSON.stringify(meetings));
}

function deleteMeeting(id) {
    let meetings = getMeetings();
    meetings = meetings.filter(m => m.id !== id);
    localStorage.setItem('meetings', JSON.stringify(meetings));
}

function getAsistencias() {
    const asistencias = localStorage.getItem('asistencias');
    return asistencias ? JSON.parse(asistencias) : [];
}

function getAttendanceRecords() {
    const records = localStorage.getItem('attendanceRecords');
    return records ? JSON.parse(records) : {};
}

function saveAttendanceRecord(sociaRut, meetingId, status, justification = null) {
    const records = getAttendanceRecords();
    const key = `${sociaRut}_${meetingId}`;

    records[key] = {
        sociaRut,
        meetingId,
        status, // 'asistio', 'no-asistio', 'justifico'
        justification,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('attendanceRecords', JSON.stringify(records));
}

// Discount Functions
function getDiscounts() {
    const discounts = localStorage.getItem('discounts');
    return discounts ? JSON.parse(discounts) : {};
}

function saveDiscount(sociaRut, convenioActivo, observacion) {
    const discounts = getDiscounts();

    discounts[sociaRut] = {
        convenioActivo,
        observacion,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('discounts', JSON.stringify(discounts));
}

// Dashboard initialization
function initializeDashboard() {
    const socias = getSocias();
    const asistencias = getAsistencias();
    const meetings = getMeetings();
    const today = new Date().toLocaleDateString('es-CL');

    const totalSocias = socias.length;
    const asistenciasHoy = asistencias.filter(a => a.fecha === today).length;
    const reunionesActivas = meetings.filter(m => m.estado === 'Activa').length;
    const fotosRegistradas = asistencias.filter(a => a.photoURL).length;

    document.getElementById('totalSocias').textContent = totalSocias;
    document.getElementById('asistenciasHoy').textContent = asistenciasHoy;
    document.getElementById('totalReuniones').textContent = reunionesActivas;
    document.getElementById('fotosRegistradas').textContent = fotosRegistradas;

    loadRecentActivity();
}

function loadRecentActivity() {
    const asistencias = getAsistencias();
    const recent = asistencias.slice(-10).reverse();
    const container = document.getElementById('recentActivityList');

    if (recent.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay actividad reciente</p>';
        return;
    }

    container.innerHTML = recent.map(a => {
        // Support both old and new format
        const nombreCompleto = a.nombreCompleto || a.nombre || `${a.nombres || ''} ${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''}`.trim();
        return `
            <div class="activity-item">
                <span><strong>${nombreCompleto}</strong> registró asistencia</span>
                <span class="activity-time">${a.fecha} ${a.hora}</span>
            </div>
        `;
    }).join('');
}

// View switching
function showView(viewName) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
    document.getElementById(viewName + 'View').classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        controlAsistencia: 'Control de Asistencia',
        nominaSocias: 'Nómina de Socias',
        descuentos: 'Gestión de Descuentos',
        vinculacion: 'Vinculación de Cuentas'
    };
    document.getElementById('viewTitle').textContent = titles[viewName];

    lucide.createIcons();
}

// Control tabs switching
function showControlTab(tabName) {
    document.querySelectorAll('.control-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'matriz') {
        loadAttendanceMatrix();
    } else if (tabName === 'reuniones') {
        loadMeetings();
    }

    lucide.createIcons();
}

// Load attendance matrix
function loadAttendanceMatrix() {
    const socias = getSocias();
    const meetings = getMeetings();
    const records = getAttendanceRecords();

    const matrix = document.getElementById('attendanceMatrix');
    const thead = matrix.querySelector('thead tr');
    const tbody = document.getElementById('matrixBody');

    if (socias.length === 0 || meetings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100" class="empty-state">No hay datos para mostrar. Crea reuniones y agrega socias.</td></tr>';
        return;
    }

    // Build header with meeting names
    thead.innerHTML = '<th class="sticky-col">Socia</th>' +
        meetings.map(m => `<th class="meeting-col" title="${m.descripcion || ''}">${m.nombre}<br><small>${m.fecha}</small></th>`).join('');

    // Build rows for each socia
    tbody.innerHTML = socias.map(socia => {
        const nombreCompleto = `${socia.nombres || socia.nombre || ''} ${socia.apellidoPaterno || ''} ${socia.apellidoMaterno || ''}`.trim();
        const cells = meetings.map(meeting => {
            const key = `${socia.rut}_${meeting.id}`;
            const record = records[key];

            let cellClass = 'attendance-cell';
            let cellContent = '-';

            if (record) {
                if (record.status === 'asistio') {
                    cellClass += ' asistio';
                    cellContent = '✓';
                } else if (record.status === 'no-asistio') {
                    cellClass += ' no-asistio';
                    cellContent = '✗';
                } else if (record.status === 'justifico') {
                    cellClass += ' justifico';
                    cellContent = 'J';
                }
            }

            return `<td class="${cellClass}" onclick="editAttendance('${socia.rut}', '${meeting.id}')" title="Click para editar">${cellContent}</td>`;
        }).join('');

        return `<tr><td class="sticky-col socia-name">${nombreCompleto}</td>${cells}</tr>`;
    }).join('');

    lucide.createIcons();
}

// Edit attendance
function editAttendance(sociaRut, meetingId) {
    const socias = getSocias();
    const meetings = getMeetings();
    const records = getAttendanceRecords();

    const socia = socias.find(s => s.rut === sociaRut);
    const meeting = meetings.find(m => m.id === meetingId);
    const key = `${sociaRut}_${meetingId}`;
    const record = records[key];

    document.getElementById('editSociaRut').value = sociaRut;
    document.getElementById('editReunionId').value = meetingId;
    document.getElementById('editSociaNombre').textContent = socia.nombre;
    document.getElementById('editReunionNombre').textContent = meeting.nombre;

    if (record) {
        document.getElementById('editEstadoAsistencia').value = record.status;
        if (record.justification) {
            document.getElementById('editJustificacion').value = record.justification;
            document.getElementById('justificacionGroup').style.display = 'block';
        }
    } else {
        document.getElementById('editEstadoAsistencia').value = '';
        document.getElementById('editJustificacion').value = '';
        document.getElementById('justificacionGroup').style.display = 'none';
    }

    document.getElementById('editarAsistenciaModal').style.display = 'flex';
    lucide.createIcons();
}

// Load meetings
function loadMeetings() {
    const meetings = getMeetings();
    const container = document.getElementById('meetingsGrid');

    if (!container) return;

    if (meetings.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay reuniones registradas</p>';
        return;
    }

    container.innerHTML = meetings.map(m => `
        <div class="meeting-card">
            <div class="meeting-header">
                <h3>${m.nombre}</h3>
                <span class="status-badge status-${m.estado.toLowerCase()}">${m.estado}</span>
            </div>
            <div class="meeting-details">
                <p><i data-lucide="calendar"></i> ${m.fecha}</p>
                <p><i data-lucide="clock"></i> ${m.hora}</p>
                <p><i data-lucide="file-text"></i> ${m.descripcion || 'Sin descripción'}</p>
            </div>
            <div class="meeting-actions">
                <button class="btn-icon" onclick="deleteMeetingConfirm('${m.id}')" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

// Load socias table
function loadSocias() {
    const socias = getSocias();
    const tbody = document.getElementById('sociasTableBody');

    if (!tbody) return;

    if (socias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay socias registradas</td></tr>';
        return;
    }

    tbody.innerHTML = socias.map(s => {
        const nombreCompleto = `${s.nombres || s.nombre || ''} ${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.trim();
        return `
        <tr>
            <td>${s.rut}</td>
            <td>${nombreCompleto}</td>
            <td>${s.email}</td>
            <td>${s.banco || '-'}</td>
            <td>${s.cuenta || '-'}</td>
            <td>${s.talla || '-'}</td>
            <td>${s.zapatos || '-'}</td>
            <td><span class="status-badge status-${s.estado.toLowerCase()}">${s.estado}</span></td>
            <td class="action-buttons">
                <button class="btn-icon" onclick="deleteSociaConfirm('${s.rut}')" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');

    lucide.createIcons();
}

// Load descuentos table
function loadDescuentos() {
    const socias = getSocias();
    const discounts = getDiscounts();
    const tbody = document.getElementById('descuentosTableBody');

    if (!tbody) return;

    if (socias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay socias registradas</td></tr>';
        return;
    }

    tbody.innerHTML = socias.map(s => {
        const nombreCompleto = `${s.nombres || s.nombre || ''} ${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.trim();
        const discount = discounts[s.rut] || { convenioActivo: false, observacion: '' };
        return `
            <tr>
                <td>${s.rut}</td>
                <td>${nombreCompleto}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${discount.convenioActivo ? 'checked' : ''}
                            onchange="toggleConvenio('${s.rut}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">${discount.convenioActivo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td>
                    <input type="text" class="observacion-input"
                        value="${discount.observacion || ''}"
                        onblur="saveObservacion('${s.rut}', this.value)"
                        placeholder="Ingresa observación...">
                </td>
                <td class="action-buttons">
                    <button class="btn-icon" onclick="clearDiscount('${s.rut}')" title="Limpiar">
                        <i data-lucide="x"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

// Toggle convenio
function toggleConvenio(sociaRut, isActive) {
    const discounts = getDiscounts();
    const current = discounts[sociaRut] || { observacion: '' };

    saveDiscount(sociaRut, isActive, current.observacion);
    loadDescuentos();
}

// Save observacion
function saveObservacion(sociaRut, observacion) {
    const discounts = getDiscounts();
    const current = discounts[sociaRut] || { convenioActivo: false };

    saveDiscount(sociaRut, current.convenioActivo, observacion);
}

// Clear discount
function clearDiscount(sociaRut) {
    if (!confirm('¿Estás seguro de limpiar el descuento de esta socia?')) return;

    const discounts = getDiscounts();
    delete discounts[sociaRut];
    localStorage.setItem('discounts', JSON.stringify(discounts));

    loadDescuentos();
}

// Modal functions
function showNuevaReunionModal() {
    document.getElementById('nuevaReunionModal').style.display = 'flex';
    lucide.createIcons();
}

function showNuevaSociaModal() {
    document.getElementById('nuevaSociaModal').style.display = 'flex';
    lucide.createIcons();
}

function showImportarModal() {
    document.getElementById('importarModal').style.display = 'flex';
    lucide.createIcons();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Setup event listeners
function setupEventListeners() {
    // Nueva reunión form
    const nuevaReunionForm = document.getElementById('nuevaReunionForm');
    if (nuevaReunionForm) {
        nuevaReunionForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const meeting = {
                id: Date.now().toString(),
                nombre: document.getElementById('reunionNombre').value,
                fecha: document.getElementById('reunionFecha').value,
                hora: document.getElementById('reunionHora').value,
                descripcion: document.getElementById('reunionDescripcion').value,
                estado: 'Activa',
                fechaCreacion: new Date().toISOString()
            };

            saveMeeting(meeting);
            loadMeetings();
            loadAttendanceMatrix();
            initializeDashboard();

            closeModal('nuevaReunionModal');
            nuevaReunionForm.reset();
        });
    }

    // Nueva socia form
    const nuevaSociaForm = document.getElementById('nuevaSociaForm');
    if (nuevaSociaForm) {
        nuevaSociaForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const rut = document.getElementById('sociaRut').value;
            const nombres = document.getElementById('sociaNombres').value;
            const apellidoPaterno = document.getElementById('sociaApellidoPaterno').value;
            const apellidoMaterno = document.getElementById('sociaApellidoMaterno').value;
            const email = document.getElementById('sociaEmail').value;
            const estado = document.getElementById('sociaEstado').value;
            const banco = document.getElementById('sociaBanco').value;
            const cuenta = document.getElementById('sociaCuenta').value;
            const talla = document.getElementById('sociaTalla').value;
            const zapatos = document.getElementById('sociaZapatos').value;

            if (!validateRUT(rut)) {
                alert('RUT inválido');
                return;
            }

            const socias = getSocias();
            if (socias.find(s => cleanRUT(s.rut) === cleanRUT(rut))) {
                alert('Este RUT ya está registrado');
                return;
            }

            const socia = {
                rut: formatRUT(rut),
                nombres: nombres,
                apellidoPaterno: apellidoPaterno,
                apellidoMaterno: apellidoMaterno,
                email: email,
                estado: estado,
                banco: banco,
                cuenta: cuenta,
                talla: talla,
                zapatos: zapatos,
                fechaRegistro: new Date().toLocaleDateString('es-CL')
            };

            saveSocia(socia);
            loadSocias();
            loadAttendanceMatrix();
            initializeDashboard();

            closeModal('nuevaSociaModal');
            nuevaSociaForm.reset();
        });
    }

    // Editar asistencia form
    const editarAsistenciaForm = document.getElementById('editarAsistenciaForm');
    if (editarAsistenciaForm) {
        editarAsistenciaForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const sociaRut = document.getElementById('editSociaRut').value;
            const meetingId = document.getElementById('editReunionId').value;
            const status = document.getElementById('editEstadoAsistencia').value;
            const justification = document.getElementById('editJustificacion').value;

            saveAttendanceRecord(sociaRut, meetingId, status, justification || null);
            loadAttendanceMatrix();

            closeModal('editarAsistenciaModal');
            editarAsistenciaForm.reset();
        });

        // Show/hide justification field
        document.getElementById('editEstadoAsistencia').addEventListener('change', (e) => {
            const justGroup = document.getElementById('justificacionGroup');
            if (e.target.value === 'justifico') {
                justGroup.style.display = 'block';
            } else {
                justGroup.style.display = 'none';
            }
        });
    }

    // Search socias
    const searchSocias = document.getElementById('searchSocias');
    if (searchSocias) {
        searchSocias.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#sociasTableBody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    // CSV file upload
    const csvFile = document.getElementById('csvFile');
    if (csvFile) {
        csvFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const csv = event.target.result;
                importCSV(csv);
            };
            reader.readAsText(file);
        });
    }
}

// Import CSV
function importCSV(csv) {
    const lines = csv.split('\n');
    const socias = getSocias();
    let imported = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [rut, nombres, apellidoPaterno, apellidoMaterno, email, estado] = line.split(',').map(s => s.trim());

        if (!validateRUT(rut)) {
            errors++;
            continue;
        }

        if (socias.find(s => cleanRUT(s.rut) === cleanRUT(rut))) {
            errors++;
            continue;
        }

        socias.push({
            rut: formatRUT(rut),
            nombres: nombres,
            apellidoPaterno: apellidoPaterno,
            apellidoMaterno: apellidoMaterno,
            email: email,
            estado: estado || 'Activo',
            fechaRegistro: new Date().toLocaleDateString('es-CL')
        });
        imported++;
    }

    localStorage.setItem('usuarios', JSON.stringify(socias));

    alert(`Importación completada:\n${imported} socias importadas\n${errors} errores`);

    loadSocias();
    loadAttendanceMatrix();
    initializeDashboard();
    closeModal('importarModal');
}

// Delete functions
function deleteSociaConfirm(rut) {
    if (!confirm('¿Estás seguro de eliminar esta socia?')) return;

    deleteSocia(rut);
    loadSocias();
    loadAttendanceMatrix();
    initializeDashboard();
}

function deleteMeetingConfirm(id) {
    if (!confirm('¿Estás seguro de eliminar esta reunión?')) return;

    deleteMeeting(id);
    loadMeetings();
    loadAttendanceMatrix();
    initializeDashboard();
}

// Logout
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminEmail');
    window.location.href = 'admin-login.html';
}

// Utility functions
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

// ===================================
// AI Assistant Chat Functions
// ===================================

// Toggle AI chat panel
function toggleAIChat() {
    const panel = document.getElementById('aiChatPanel');
    const button = document.getElementById('aiChatButton');

    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        button.classList.remove('active');
    } else {
        panel.classList.add('open');
        button.classList.add('active');
        // Focus input
        setTimeout(() => {
            document.getElementById('aiChatInput').focus();
        }, 300);
        lucide.createIcons();
    }
}

// Send AI message
async function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to chat
    addMessageToChat('user', message);

    // Show typing indicator
    showTypingIndicator();

    // Process message with AI assistant
    try {
        const response = await aiAssistant.processMessage(message);

        // Hide typing indicator
        hideTypingIndicator();

        // Add assistant response
        addMessageToChat('assistant', response);
    } catch (error) {
        hideTypingIndicator();
        addMessageToChat('assistant', 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta nuevamente.');
    }

    lucide.createIcons();
}

// Handle Enter key in chat input
function handleAIChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendAIMessage();
    }
}

// Send quick action
function sendQuickAction(command) {
    const input = document.getElementById('aiChatInput');
    input.value = command;
    sendAIMessage();
}

// Add message to chat
function addMessageToChat(type, text) {
    const messagesContainer = document.getElementById('aiChatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Convert markdown-style bold to HTML
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    contentDiv.innerHTML = formattedText;
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    document.getElementById('aiTypingIndicator').style.display = 'flex';
    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    document.getElementById('aiTypingIndicator').style.display = 'none';
}

// Load chat history on page load
if (document.querySelector('.admin-page') && aiAssistant) {
    const history = aiAssistant.getHistory();
    if (history.length > 1) { // More than just the initial greeting
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.innerHTML = ''; // Clear initial message

        history.forEach(msg => {
            addMessageToChat(msg.type, msg.text);
        });
    }
}

// Demo data removed - admins must add members manually
if (document.querySelector('.admin-page')) {
    // No demo data initialization
}
