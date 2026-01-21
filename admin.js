// ===================================
// APP Asistencia - Admin Panel Logic (Phase 4 - Reorganized)
// Consolidated attendance control and member roster
// ===================================

// Global State for Member Table
let currentSociasSort = { criteria: 'numReg', direction: 'asc' };
let currentSociasCategory = 'all';
let currentSociasQuery = '';

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
    loadJustificacionesSelects();
    loadJustificacionesTable();
    setupEventListeners();

    // Load data from Drive if signed in
    setTimeout(async () => {
        if (typeof driveIntegration !== 'undefined' && driveIntegration && driveIntegration.isSignedIn) {
            const loaded = await driveIntegration.loadAllFromDrive();
            if (loaded) {
                // Refresh views with newly loaded data
                initializeDashboard();
                loadSocias();
                loadMeetings();
                loadAttendanceMatrix();
                loadJustificacionesSelects();
                loadJustificacionesTable();
            }
        }
    }, 2000);
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
    meetings.push({
        ...meeting,
        habilitada: true
    });
    localStorage.setItem('meetings', JSON.stringify(meetings));
}

function toggleMeetingStatus(id, isEnabled) {
    let meetings = getMeetings();
    const index = meetings.findIndex(m => m.id === id);
    if (index !== -1) {
        meetings[index].habilitada = isEnabled;
        meetings[index].estado = isEnabled ? 'Activa' : 'Inactiva';
        localStorage.setItem('meetings', JSON.stringify(meetings));
        loadMeetings();
        loadAttendanceMatrix();
        initializeDashboard();
    }
}

function exportMeetingReport(meetingId) {
    const meetings = getMeetings();
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    const socias = getSocias();
    const records = getAttendanceRecords();

    const headers = ['RUT', 'Nombre', 'Estado de Asistencia', 'Justificacion'];
    const rows = socias.map(s => {
        const record = records[`${s.rut}_${meetingId}`] || { status: 'Sin registro', justification: '' };
        const nombreCompleto = `${s.nombres || s.nombre || ''} ${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.trim();
        return [
            s.rut,
            nombreCompleto,
            record.status,
            record.justification || ''
        ];
    });

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${meeting.nombre.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function deleteAllSocias() {
    if (!confirm('¿Estás seguro de que quieres eliminar TODAS las socias? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem('usuarios');
    loadSocias();
    loadAttendanceMatrix();
    initializeDashboard();
}

function finalizarDescuento(sociaRut) {
    if (!confirm('¿Estas seguro de que quieres finalizar el descuento de esta socia? Sera removida de la nomina de descuentos.')) return;
    const discounts = getDiscounts();
    delete discounts[sociaRut];
    localStorage.setItem('discounts', JSON.stringify(discounts));
    loadDescuentos();
}

async function notificarDescuento(sociaRut) {
    const socias = getSocias();
    const socia = socias.find(s => s.rut === sociaRut);
    const discounts = getDiscounts();
    const discount = discounts[sociaRut];

    if (!socia || !discount) {
        alert('No se encontro información de la socia o su descuento.');
        return;
    }

    if (!driveIntegration || !driveIntegration.isSignedIn) {
        alert('Por favor conecta con Google Drive para enviar correos.');
        return;
    }

    const subject = `Notificacion de Descuento - SINTRAMAE`;
    const body = `Hola ${socia.nombres},\n\nTe notificamos sobre el estado de tu descuento:\n` +
        `Estado: ${discount.convenioActivo ? 'Activo' : 'Inactivo'}\n` +
        `Observacion: ${discount.observacion || 'Sin observaciones'}\n\n` +
        `Saludos,\nAdministracion SINTRAMAE`;

    try {
        await driveIntegration.sendEmail(socia.email, subject, body);
        alert('Notificacion enviada exitosamente.');
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Error al enviar la notificacion. Verifica los permisos de Gmail.');
    }
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
    const meetings = getMeetings();
    const records = getAttendanceRecords();

    const today = new Date().toLocaleDateString('es-CL');

    const totalSocias = socias.length;
    const reunionesActivas = meetings.filter(m => m.estado === 'Activa').length;

    // Asistencias Hoy
    const asistenciasHoy = Object.values(records).filter(r => {
        const date = new Date(r.timestamp).toLocaleDateString('es-CL');
        return date === today && r.status === 'asistio';
    }).length;

    // Asistencia Promedio Global
    let totalAsistencias = 0;
    Object.values(records).forEach(r => {
        if (r.status === 'asistio') totalAsistencias++;
    });

    const totalPosibles = totalSocias * meetings.length;
    const asistenciaPromedio = totalPosibles > 0 ? Math.round((totalAsistencias / totalPosibles) * 100) : 0;

    const totalSociasEl = document.getElementById('totalSocias');
    const asistenciasHoyEl = document.getElementById('asistenciasHoy');
    const totalReunionesEl = document.getElementById('totalReuniones');
    const asistenciaPromedioEl = document.getElementById('asistenciaPromedio');

    if (totalSociasEl) totalSociasEl.textContent = totalSocias;
    if (asistenciasHoyEl) asistenciasHoyEl.textContent = asistenciasHoy;
    if (totalReunionesEl) totalReunionesEl.textContent = reunionesActivas;
    if (asistenciaPromedioEl) asistenciaPromedioEl.textContent = asistenciaPromedio + '%';

    loadRecentActivity();
}

function loadRecentActivity() {
    const records = getAttendanceRecords();
    const socias = getSocias();
    const recent = Object.values(records).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    const container = document.getElementById('recentActivityList');

    if (!container) return;

    if (recent.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay actividad reciente</p>';
        return;
    }

    container.innerHTML = recent.map(a => {
        const socia = socias.find(s => cleanRUT(s.rut) === cleanRUT(a.sociaRut));
        const nombreCompleto = socia ? `${socia.nombres} ${socia.apellidoPaterno}` : a.sociaRut;
        const date = new Date(a.timestamp).toLocaleString('es-CL');

        let statusText = '';
        if (a.status === 'asistio') statusText = 'registró <span class="badge-asistio">Asistencia</span>';
        else if (a.status === 'no-asistio') statusText = 'marcada como <span class="badge-no-asistio">Ausente</span>';
        else if (a.status === 'justifico') statusText = 'registró <span class="badge-justifico">Justificación</span>';

        return `
            <div class="activity-item">
                <span><strong>${nombreCompleto}</strong> ${statusText}</span>
                <span class="activity-time">${date}</span>
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
    if (!matrix) return;

    const thead = matrix.querySelector('thead tr');
    const tbody = document.getElementById('matrixBody');

    if (socias.length === 0 || meetings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100" class="empty-state">No hay datos para mostrar. Crea reuniones y agrega socias.</td></tr>';
        return;
    }

    // Build header with meeting names + Percentage
    thead.innerHTML = '<th class="sticky-col">Socia</th>' +
        meetings.map(m => `<th class="meeting-col" title="${m.descripcion || ''}">${m.nombre}<br><small>${m.fecha}</small></th>`).join('') +
        '<th class="stats-col">% Asist.</th>';

    // Build rows for each socia
    tbody.innerHTML = socias.map(socia => {
        const nombreCompleto = `${socia.nombres || socia.nombre || ''} ${socia.apellidoPaterno || ''} ${socia.apellidoMaterno || ''}`.trim();

        let asistencias = 0;
        let totalValidas = 0;

        const cells = meetings.map(meeting => {
            const key = `${socia.rut}_${meeting.id}`;
            const record = records[key];

            let cellClass = 'attendance-cell';
            let cellContent = '<i data-lucide="minus" class="icon-pending"></i>';

            if (record) {
                totalValidas++;
                if (record.status === 'asistio') {
                    cellClass += ' asistio';
                    cellContent = '🟢';
                    asistencias++;
                } else if (record.status === 'no-asistio') {
                    cellClass += ' no-asistio';
                    cellContent = '🔴';
                } else if (record.status === 'justifico') {
                    cellClass += ' justifico';
                    cellContent = '🟡';
                }
            }

            return `<td class="${cellClass}" onclick="editAttendance('${socia.rut}', '${meeting.id}')" title="Click para editar">${cellContent}</td>`;
        }).join('');

        const porcentaje = meetings.length > 0 ? Math.round((asistencias / meetings.length) * 100) : 0;
        const porcentajeClass = porcentaje >= 75 ? 'pct-high' : porcentaje >= 50 ? 'pct-med' : 'pct-low';

        return `
            <tr>
                <td class="sticky-col socia-name">
                    <div class="socia-info-cell">
                        <strong>${nombreCompleto}</strong>
                        <small>${socia.rut}</small>
                    </div>
                </td>
                ${cells}
                <td class="stats-pct ${porcentajeClass}"><strong>${porcentaje}%</strong></td>
            </tr>`;
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
        <div class="meeting-card ${m.habilitada === false ? 'meeting-disabled' : ''}">
            <div class="meeting-header">
                <h3>${m.nombre}</h3>
                <span class="status-badge status-${m.estado.toLowerCase()}">${m.estado}</span>
            </div>
            <div class="meeting-details">
                <p><i data-lucide="calendar"></i> ${m.fecha}</p>
                <p><i data-lucide="clock"></i> ${m.hora}</p>
                <div class="meeting-controls" style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <label class="toggle-switch">
                        <input type="checkbox" ${m.habilitada !== false ? 'checked' : ''} onchange="toggleMeetingStatus('${m.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">${m.habilitada !== false ? 'Habilitada' : 'Deshabilitada'}</span>
                </div>
            </div>
            <div class="meeting-actions">
                <button class="btn-secondary btn-sm" onclick="exportMeetingReport('${m.id}')" title="Descargar Informe">
                    <i data-lucide="file-down"></i> Informe
                </button>
                <button class="btn-icon" onclick="deleteMeetingConfirm('${m.id}')" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

// Sorting logic
function sortTable(criteria) {
    if (currentSociasSort.criteria === criteria) {
        currentSociasSort.direction = currentSociasSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSociasSort.criteria = criteria;
        currentSociasSort.direction = 'asc';
    }

    // Update UI headers
    document.querySelectorAll('.data-table th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        const icon = th.querySelector('i');
        if (icon) icon.setAttribute('data-lucide', 'chevrons-up-down');
    });

    const activeTh = Array.from(document.querySelectorAll('.data-table th.sortable')).find(th =>
        th.getAttribute('onclick')?.includes(`'${criteria}'`)
    );

    if (activeTh) {
        activeTh.classList.add(`sorted-${currentSociasSort.direction}`);
        const icon = activeTh.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', currentSociasSort.direction === 'asc' ? 'chevron-up' : 'chevron-down');
        }
    }

    lucide.createIcons();
    loadSocias();
}

// Column filtering logic
function filterTableColumns(category) {
    currentSociasCategory = category;

    // Update tabs UI
    document.querySelectorAll('.table-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.innerText.toLowerCase().includes(category === 'laboral' ? 'institucional' : category.toLowerCase())) {
            tab.classList.add('active');
        }
    });

    if (category === 'all') {
        document.querySelectorAll('.table-tab')[0].classList.add('active');
    }

    loadSocias();
}

// Load socias table
function loadSocias() {
    let socias = getSocias();
    const tbody = document.getElementById('sociasTableBody');

    if (!tbody) return;

    // Apply Search Filter
    if (currentSociasQuery) {
        const query = currentSociasQuery.toLowerCase();
        socias = socias.filter(s =>
            (s.rut && s.rut.toLowerCase().includes(query)) ||
            (s.nombres && s.nombres.toLowerCase().includes(query)) ||
            (s.apellidoPaterno && s.apellidoPaterno.toLowerCase().includes(query)) ||
            (s.apellidoMaterno && s.apellidoMaterno.toLowerCase().includes(query)) ||
            (s.comuna && s.comuna.toLowerCase().includes(query)) ||
            (s.empresa && s.empresa.toLowerCase().includes(query))
        );
    }

    // Apply Sorting
    if (currentSociasSort.criteria) {
        socias.sort((a, b) => {
            let valA = a[currentSociasSort.criteria] || '';
            let valB = b[currentSociasSort.criteria] || '';

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return currentSociasSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSociasSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    if (socias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="20" class="empty-state">No hay socias registradas</td></tr>';
        return;
    }

    // Category mapping (index of columns to show/hide)
    // Indexes: 0:Acc, 1:NumReg, 2:RUT, 3:Nombres, 4:Pat, 5:Mat, 6:Comuna, 7:RegAnt, 8:FNac, 9:Edad, 10:ECivil, 11:Celular, 12:Dir, 13:Email, 14:RBD, 15:AñoPAE, 16:HMen, 17:HMay, 18:Emp, 19:Est
    const categories = {
        'all': Array.from({ length: 20 }, (_, i) => i),
        'basico': [0, 1, 2, 3, 4, 5, 19],
        'contacto': [0, 2, 3, 4, 6, 11, 12, 13],
        'personal': [0, 2, 3, 4, 8, 9, 10, 16, 17],
        'laboral': [0, 1, 2, 3, 4, 7, 14, 15, 18, 19]
    };

    const visibleCols = categories[currentSociasCategory] || categories['all'];

    // Update header visibility
    document.querySelectorAll('.data-table thead th').forEach((th, i) => {
        if (visibleCols.includes(i)) th.classList.remove('col-hidden');
        else th.classList.add('col-hidden');
    });

    tbody.innerHTML = socias.map(s => {
        const row = [
            `<div class="action-buttons">
                <button class="btn-icon" onclick="deleteSociaConfirm('${s.rut}')" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>`,
            `<span contenteditable="true" data-field="numReg" data-rut="${s.rut}" class="editable-cell">${s.numReg || ''}</span>`,
            s.rut,
            `<span contenteditable="true" data-field="nombres" data-rut="${s.rut}" class="editable-cell">${s.nombres || ''}</span>`,
            `<span contenteditable="true" data-field="apellidoPaterno" data-rut="${s.rut}" class="editable-cell">${s.apellidoPaterno || ''}</span>`,
            `<span contenteditable="true" data-field="apellidoMaterno" data-rut="${s.rut}" class="editable-cell">${s.apellidoMaterno || ''}</span>`,
            `<span contenteditable="true" data-field="comuna" data-rut="${s.rut}" class="editable-cell">${s.comuna || ''}</span>`,
            `<span contenteditable="true" data-field="numRegAnt" data-rut="${s.rut}" class="editable-cell">${s.numRegAnt || ''}</span>`,
            `<input type="date" value="${s.fechaNacimiento || ''}" data-field="fechaNacimiento" data-rut="${s.rut}" class="editable-date" onchange="updateSociaField('${s.rut}', 'fechaNacimiento', this.value)">`,
            `<span contenteditable="true" data-field="edad" data-rut="${s.rut}" class="editable-cell">${s.edad || ''}</span>`,
            `<select data-field="estadoCivil" data-rut="${s.rut}" class="editable-select" onchange="updateSociaField('${s.rut}', 'estadoCivil', this.value)">
                <option value="">--</option>
                <option value="Soltera" ${s.estadoCivil === 'Soltera' ? 'selected' : ''}>Soltera</option>
                <option value="Casada" ${s.estadoCivil === 'Casada' ? 'selected' : ''}>Casada</option>
                <option value="Divorciada" ${s.estadoCivil === 'Divorciada' ? 'selected' : ''}>Divorciada</option>
                <option value="Viuda" ${s.estadoCivil === 'Viuda' ? 'selected' : ''}>Viuda</option>
                <option value="Conviviente" ${s.estadoCivil === 'Conviviente' ? 'selected' : ''}>Conviviente</option>
            </select>`,
            `<span contenteditable="true" data-field="celular" data-rut="${s.rut}" class="editable-cell">${s.celular || ''}</span>`,
            `<span contenteditable="true" data-field="direccion" data-rut="${s.rut}" class="editable-cell">${s.direccion || ''}</span>`,
            `<span contenteditable="true" data-field="email" data-rut="${s.rut}" class="editable-cell">${s.email || ''}</span>`,
            `<span contenteditable="true" data-field="rbd" data-rut="${s.rut}" class="editable-cell">${s.rbd || ''}</span>`,
            `<span contenteditable="true" data-field="anoIngresoPae" data-rut="${s.rut}" class="editable-cell">${s.anoIngresoPae || ''}</span>`,
            `<span contenteditable="true" data-field="hijosMenores" data-rut="${s.rut}" class="editable-cell">${s.hijosMenores || '0'}</span>`,
            `<span contenteditable="true" data-field="hijosMayores" data-rut="${s.rut}" class="editable-cell">${s.hijosMayores || '0'}</span>`,
            `<span contenteditable="true" data-field="empresa" data-rut="${s.rut}" class="editable-cell">${s.empresa || ''}</span>`,
            `<select data-field="estado" data-rut="${s.rut}" class="editable-select" onchange="updateSociaField('${s.rut}', 'estado', this.value)">
                <option value="Activo" ${(s.estado || 'Activo') === 'Activo' ? 'selected' : ''}>Activo</option>
                <option value="Inactivo" ${s.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>`
        ];

        const cells = row.map((cell, i) => {
            const hiddenClass = visibleCols.includes(i) ? '' : 'class="col-hidden"';
            return `<td ${hiddenClass}>${cell}</td>`;
        }).join('');

        return `<tr>${cells}</tr>`;
    }).join('');

    // Add event listeners for contenteditable cells
    setTimeout(() => {
        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('blur', function () {
                const rut = this.getAttribute('data-rut');
                const field = this.getAttribute('data-field');
                const value = this.textContent.trim();
                updateSociaField(rut, field, value);
            });
        });
    }, 100);

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
                        placeholder="Ingresa observacion...">
                </td>
                <td class="action-buttons">
                    <button class="btn-primary btn-sm" onclick="notificarDescuento('${s.rut}')" title="Notificar">
                        <i data-lucide="mail"></i> Notificar
                    </button>
                    <button class="btn-secondary btn-sm" onclick="finalizarDescuento('${s.rut}')" title="Finalizar Descuento">
                        <i data-lucide="check-circle"></i> Finalizar
                    </button>
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

// Update individual socia field (for inline editing)
function updateSociaField(rut, field, value) {
    const socias = getSocias();
    const socia = socias.find(s => cleanRUT(s.rut) === cleanRUT(rut));

    if (socia) {
        socia[field] = value;
        localStorage.setItem('usuarios', JSON.stringify(socias));

        // Show subtle feedback
        console.log(`Updated ${field} for ${rut}: ${value}`);
    }
}

// Manual save all socias (triggered by "Guardar Info" button)
function manualSaveSocias() {
    // Data is already saved via updateSociaField, this just provides user feedback
    const socias = getSocias();

    if (driveIntegration) {
        driveIntegration.syncData().then(() => {
            alert(`✅ Información guardada correctamente.\n\n${socias.length} socias actualizadas.`);
        }).catch(err => {
            alert(`✅ Información guardada localmente.\n\n${socias.length} socias actualizadas.\n\n⚠️ No se pudo sincronizar con Google Drive.`);
        });
    } else {
        alert(`✅ Información guardada correctamente.\n\n${socias.length} socias actualizadas.`);
    }
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
            const telefono = document.getElementById('sociaTelefono').value;

            if (!validateRUT(rut)) {
                alert('RUT inválido. Por favor verifica el formato.');
                return;
            }

            const socias = getSocias();
            if (socias.find(s => cleanRUT(s.rut) === cleanRUT(rut))) {
                alert('Este RUT ya está registrado en el sistema.');
                return;
            }

            const socia = {
                rut: formatRUT(rut),
                numReg: (socias.length + 1).toString().padStart(3, '0'),
                nombres: nombres || '',
                apellidoPaterno: apellidoPaterno || '',
                apellidoMaterno: apellidoMaterno || '',
                comuna: '',
                numRegAnt: '',
                fechaNacimiento: '',
                edad: '',
                estadoCivil: '',
                celular: telefono || '',
                telefono: telefono || '',
                direccion: '',
                email: '',
                estado: 'Activo',
                rbd: '',
                anoIngresoPae: '',
                hijosMenores: '0',
                hijosMayores: '0',
                empresa: '',
                fechaRegistro: new Date().toLocaleDateString('es-CL')
            };

            saveSocia(socia);
            loadSocias();
            loadAttendanceMatrix();
            initializeDashboard();
            loadJustificacionesSelects(); // Update selects for justifications

            alert(`✅ Socia registrada: ${nombres} ${apellidoPaterno}`);

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
            currentSociasQuery = e.target.value;
            loadSocias();
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

    // Expected format: numReg, rut, nombres, apPaterno, apMaterno, comuna, numRegAnt, fNac, edad, estCivil, celular, direccion, email, rbd, anoPae, hMenores, hMayores, empresa
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 2) { errors++; continue; }

        const [numReg, rut, nombres, apPat, apMat, comuna, regAnt, fNac, edad, ecivil, cel, dir, email, rbd, anoPae, hMen, hMay, emp] = parts;

        if (!validateRUT(rut)) {
            errors++;
            continue;
        }

        if (socias.find(s => cleanRUT(s.rut) === cleanRUT(rut))) {
            errors++;
            continue;
        }

        socias.push({
            numReg: numReg || '',
            rut: formatRUT(rut),
            nombres: nombres || '',
            apellidoPaterno: apPat || '',
            apellidoMaterno: apMat || '',
            comuna: comuna || '',
            numRegAnt: regAnt || '',
            fechaNacimiento: fNac || '',
            edad: edad || '',
            estadoCivil: ecivil || '',
            celular: cel || '',
            direccion: dir || '',
            email: email || '',
            rbd: rbd || '',
            anoIngresoPae: anoPae || '',
            hijosMenores: hMen || '0',
            hijosMayores: hMay || '0',
            empresa: emp || '',
            estado: 'Activo',
            fechaRegistro: new Date().toLocaleDateString('es-CL')
        });
        imported++;
    }

    localStorage.setItem('usuarios', JSON.stringify(socias));

    if (driveIntegration) driveIntegration.syncData();

    alert(`Importación completada:\n✅ ${imported} socias importadas\n❌ ${errors} errores o duplicados`);

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

    if (driveIntegration) driveIntegration.syncData();
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
// Utility functions
function getUsuarios() {
    const usuarios = localStorage.getItem('usuarios');
    return usuarios ? JSON.parse(usuarios) : [];
}

// Alias for getUsuarios (since we used socias terminology in admin)
function getSocias() {
    return getUsuarios();
}

// ===================================
// Justificaciones Logic
// ===================================

function loadJustificacionesSelects() {
    const sociaSelect = document.getElementById('justSociaSelect');
    const reunionSelect = document.getElementById('justReunionSelect');

    if (!sociaSelect || !reunionSelect) return;

    const socias = getSocias();
    const meetings = getMeetings();

    sociaSelect.innerHTML = '<option value="">-- Seleccionar socia --</option>' +
        socias.map(s => `<option value="${s.rut}">${s.nombres} ${s.apellidoPaterno} (${s.rut})</option>`).join('');

    reunionSelect.innerHTML = '<option value="">-- Seleccionar reunión --</option>' +
        meetings.map(m => `<option value="${m.id}">${m.nombre} (${m.fecha})</option>`).join('');
}

function guardarJustificacion() {
    const rut = document.getElementById('justSociaSelect').value;
    const meetingId = document.getElementById('justReunionSelect').value;
    const motivo = document.getElementById('justMotivo').value;

    if (!rut || !meetingId || !motivo) {
        alert('Por favor completa todos los campos.');
        return;
    }

    saveAttendanceRecord(rut, meetingId, 'justifico', motivo);

    // Update tables
    loadAttendanceMatrix();
    loadJustificacionesTable();
    limpiarFormularioJustificacion();

    alert('✅ Justificación guardada exitosamente.');
}

function limpiarFormularioJustificacion() {
    document.getElementById('justSociaSelect').value = '';
    document.getElementById('justReunionSelect').value = '';
    document.getElementById('justMotivo').value = '';
}

function loadJustificacionesTable() {
    const tbody = document.getElementById('justificacionesTableBody');
    if (!tbody) return;

    const socias = getSocias();
    const meetings = getMeetings();
    const records = getAttendanceRecords();

    const justificaciones = [];
    Object.values(records).forEach(record => {
        if (record.status === 'justifico') {
            const socia = socias.find(s => cleanRUT(s.rut) === cleanRUT(record.sociaRut));
            const meeting = meetings.find(m => m.id === record.meetingId);

            if (socia && meeting) {
                justificaciones.push({
                    socia: `${socia.nombres} ${socia.apellidoPaterno}`,
                    meeting: meeting.nombre,
                    fecha: meeting.fecha,
                    motivo: record.justification,
                    id: `${record.sociaRut}_${record.meetingId}`
                });
            }
        }
    });

    if (justificaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay justificaciones registradas</td></tr>';
        return;
    }

    tbody.innerHTML = justificaciones.map(j => `
        <tr>
            <td>${j.socia}</td>
            <td>${j.meeting}</td>
            <td>${j.fecha}</td>
            <td>${j.motivo}</td>
            <td>
                <button class="btn-icon" onclick="eliminarJustificacion('${j.id}')" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function eliminarJustificacion(id) {
    if (!confirm('¿Estás seguro de eliminar esta justificación?')) return;

    const records = getAttendanceRecords();
    delete records[id];
    localStorage.setItem('attendanceRecords', JSON.stringify(records));

    loadAttendanceMatrix();
    loadJustificacionesTable();
}

// ===================================
// Integration with new modules
// ===================================

// PDF Generation
async function exportMeetingReport(meetingId) {
    if (typeof generateMeetingReport === 'function') {
        await generateMeetingReport(meetingId);
    } else {
        // Fallback to basic CSV if module not loaded
        basicCSVExport(meetingId);
    }
}

function basicCSVExport(meetingId) {
    const meetings = getMeetings();
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    const socias = getSocias();
    const records = getAttendanceRecords();

    const headers = ['RUT', 'Nombre', 'Estado', 'Justificación'];
    const rows = socias.map(s => {
        const record = records[`${s.rut}_${meetingId}`] || { status: 'Pendiente', justification: '' };
        return [s.rut, `${s.nombres} ${s.apellidoPaterno}`, record.status, record.justification || ''];
    });

    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${meeting.nombre.replace(/\s+/g, '_')}.csv`;
    link.click();
}

function getDiscounts() {
    const discounts = localStorage.getItem('discounts');
    return discounts ? JSON.parse(discounts) : [];
}

function cleanRUT(rut) {
    if (!rut) return '';
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
    const bubble = document.getElementById('aiReminderBubble'); // Get bubble ref

    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        button.classList.remove('active');
    } else {
        panel.classList.add('open');
        button.classList.add('active');
        // Close bubble when chat opens
        if (bubble) bubble.style.display = 'none';

        // Focus input
        setTimeout(() => {
            document.getElementById('aiChatInput').focus();
        }, 300);
        lucide.createIcons();
    }
}

function closeAIBubble() {
    const bubble = document.getElementById('aiReminderBubble');
    if (bubble) {
        bubble.style.display = 'none';
        // Optional: Save preference to localStorage so it doesn't pop up again this session
        sessionStorage.setItem('aiBubbleClosed', 'true');
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

// Demo data initialization
if (document.querySelector('.admin-page')) {
    // initializeDemoData(); // Removed to prevent error if not defined
}

function initializeDemoData() {
    const usuarios = getUsuarios();
    if (usuarios.length === 0) {
        console.log("Initializing demo data...");
        const demoUsers = [
            { rut: "12.345.678-1", nombres: "María", apellidoPaterno: "González", apellidoMaterno: "Pérez", email: "maria.gonzalez@email.com", estado: "Activo", banco: "Banco Estado", cuenta: "123456", talla: "M", zapatos: "37" },
            { rut: "13.456.789-2", nombres: "Ana", apellidoPaterno: "Silva", apellidoMaterno: "Rojas", email: "ana.silva@email.com", estado: "Activo", banco: "Banco de Chile", cuenta: "987654", talla: "S", zapatos: "36" },
            { rut: "14.567.890-3", nombres: "Carmen", apellidoPaterno: "López", apellidoMaterno: "Díaz", email: "carmen.lopez@email.com", estado: "Inactivo", banco: "Santander", cuenta: "456123", talla: "L", zapatos: "38" },
            { rut: "15.678.901-4", nombres: "Patricia", apellidoPaterno: "Muñoz", apellidoMaterno: "Soto", email: "patricia.munoz@email.com", estado: "Activo", banco: "Banco Estado", cuenta: "789456", talla: "XL", zapatos: "39" },
            { rut: "16.789.012-5", nombres: "Carolina", apellidoPaterno: "Reyes", apellidoMaterno: "Morales", email: "carolina.reyes@email.com", estado: "Activo", banco: "Scotiabank", cuenta: "321654", talla: "M", zapatos: "37" },
            { rut: "17.890.123-6", nombres: "Claudia", apellidoPaterno: "Herrera", apellidoMaterno: "Castro", email: "claudia.herrera@email.com", estado: "Activo", banco: "Banco Falabella", cuenta: "654987", talla: "S", zapatos: "36" },
            { rut: "18.901.234-7", nombres: "Daniela", apellidoPaterno: "Vargas", apellidoMaterno: "Ortiz", email: "daniela.vargas@email.com", estado: "Activo", banco: "Bci", cuenta: "147258", talla: "L", zapatos: "38" },
            { rut: "19.012.345-8", nombres: "Francisca", apellidoPaterno: "Jiménez", apellidoMaterno: "Lagos", email: "francisca.jimenez@email.com", estado: "Inactivo", banco: "Banco Estado", cuenta: "258369", talla: "M", zapatos: "37" },
            { rut: "20.123.456-9", nombres: "Camila", apellidoPaterno: "Torres", apellidoMaterno: "Vega", email: "camila.torres@email.com", estado: "Activo", banco: "Santander", cuenta: "369147", talla: "XS", zapatos: "35" },
            { rut: "21.234.567-0", nombres: "Valentina", apellidoPaterno: "Guzmán", apellidoMaterno: "Navarro", email: "valentina.guzman@email.com", estado: "Activo", banco: "Banco de Chile", cuenta: "741852", talla: "S", zapatos: "36" }
        ];

        saveUsuarios(demoUsers);

        // Add some dummy attendance
        const asistencias = [
            { rut: "12345678-1", fecha: "2024-05-01", hora: "09:00", estado: "asistio" },
            { rut: "13456789-2", fecha: "2024-05-01", hora: "09:15", estado: "asistio" },
            { rut: "17890123-6", fecha: "2024-05-01", hora: "09:05", estado: "asistio" }
        ];
        saveAsistencias(asistencias);

        loadSocias();
    }
}
// === Sidebar Toggle Logic ===
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.admin-main');

    sidebar.classList.toggle('collapsed');

    // Adjust logic for overlay on mobile if needed
    // For now purely CSS driven
}

// === Reportes View Logic ===
function renderReportesView() {
    // Populate Massive Report
    const usuarios = getUsuarios();
    const asistencias = getAsistencias();
    const tableBody = document.querySelector('#tablaReporteMasivo tbody');

    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (usuarios.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay datos para mostrar</td></tr>';
        return;
    }

    usuarios.forEach(user => {
        const nombreCompleto = `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;

        // Calculate Stats
        const userAsistencias = asistencias.filter(a => cleanRUT(a.rut) === cleanRUT(user.rut));
        const totalAsistencias = userAsistencias.length;

        // Basic Stats
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-medium">${formatRUT(user.rut)}</td>
            <td>${nombreCompleto}</td>
            <td class="text-center">${totalAsistencias}</td>
            <td class="text-center">0</td> <!-- Placeholder for Atrasos -->
            <td class="text-center">0</td> <!-- Placeholder for Inasistencias -->
            <td><span class="badge ${user.estado === 'Activo' ? 'badge-success' : 'badge-danger'}">${user.estado}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

function switchReportTab(tabName) {
    // Update Tabs UI
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        if (tab.onclick.toString().includes(tabName)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update Content Visibility
    const contents = document.querySelectorAll('.report-tab-content');
    contents.forEach(content => content.style.display = 'none');

    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
}

function searchSociaForReport() {
    const searchTerm = document.getElementById('searchReporteIndividual').value.toLowerCase();
    const resultContainer = document.getElementById('reporteIndividualResult');
    const usuarios = getUsuarios();

    if (searchTerm.length < 2) {
        resultContainer.style.display = 'none';
        return;
    }

    const foundUser = usuarios.find(u =>
        u.rut.includes(searchTerm) ||
        `${u.nombres} ${u.apellidoPaterno}`.toLowerCase().includes(searchTerm)
    );

    if (foundUser) {
        const asistencias = getAsistencias();
        const userAsistencias = asistencias.filter(a => cleanRUT(a.rut) === cleanRUT(foundUser.rut));

        resultContainer.innerHTML = `
            <h3>Ficha Individual: ${foundUser.nombres} ${foundUser.apellidoPaterno}</h3>
            <div class="report-summary-grid">
                <div class="summary-item">
                    <span class="summary-value">${userAsistencias.length}</span>
                    <span class="summary-label">Asistencias Totales</span>
                </div>
                 <div class="summary-item">
                    <span class="summary-value">0</span>
                    <span class="summary-label">Atrasos</span>
                </div>
                 <div class="summary-item">
                    <span class="summary-value">0</span>
                    <span class="summary-label">Faltas Injustificadas</span>
                </div>
            </div>
            
            <h4 style="margin-top:20px;">Historial Reciente</h4>
            <ul style="list-style: none; padding: 0;">
                ${userAsistencias.slice(-5).reverse().map(a => `
                    <li style="padding: 10px; border-bottom: 1px solid #eee;">
                        📅 ${a.fecha} - ⏰ ${a.hora}
                    </li>
                `).join('') || '<li style="padding:10px;">Sin registros recientes</li>'}
            </ul>
        `;
        resultContainer.style.display = 'block';
    } else {
        resultContainer.style.display = 'none';
    }
}

function exportReporteMasivo() {
    const usuarios = getUsuarios();
    if (usuarios.length === 0) {
        alert("No hay datos para exportar");
        return;
    }

    // Add BOM for Excel UTF-8 compatibility
    let csvContent = "\uFEFF";
    csvContent += "RUT;Nombre Completo;Estado;Asistencias;Atrasos\n"; // Using semicolon for Spanish Excel

    const asistencias = getAsistencias();

    usuarios.forEach(user => {
        const nombreCompleto = `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
        const totalAsistencias = asistencias.filter(a => cleanRUT(a.rut) === cleanRUT(user.rut)).length;
        csvContent += `${user.rut};${nombreCompleto};${user.estado};${totalAsistencias};0\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_consolidado_sintramae.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Mobile: Auto collapse sidebar on selection
if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.add('collapsed');
}

// Hook into showView to render reports
const originalShowView = window.showView;
window.showView = function (viewId) {
    if (viewId === 'reportes') {
        renderReportesView();
    }

    // Hide all views
    document.querySelectorAll('.view-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Handle viewId that might be hash format
    const targetId = viewId.replace('#', '');
    const selectedView = document.getElementById(targetId + 'View') || document.getElementById('view-' + targetId);

    if (selectedView) {
        selectedView.style.display = 'block';
        lucide.createIcons(); // Re-render icons for new view
    }

    // Active nav state
    const activeNav = document.querySelector(`a[href="#${targetId === 'controlAsistencia' ? 'control-asistencia' : targetId === 'nominaSocias' ? 'nomina-socias' : targetId === 'generarDocumentos' ? 'generar-documentos' : targetId}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Title update
    const titles = {
        dashboard: 'Dashboard',
        controlAsistencia: 'Control de Asistencia',
        nominaSocias: 'Nómina de Socias',
        justificaciones: 'Justificaciones',
        vinculacion: 'Vinculación'
    };
    const titleEl = document.getElementById('viewTitle');
    if (titleEl && titles[targetId]) titleEl.textContent = titles[targetId];

    // Mobile: Auto collapse sidebar on selection
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('collapsed');
    }
}

// ===================================
// Document Generation Logic
// ===================================
// ===================================
// Document Generation Logic
// ===================================
function downloadCSVTemplate() {
    // Add BOM for Excel compatibility (\uFEFF)
    const csvContent = "\uFEFFRUT,Nombres,Apellido Paterno,Apellido Materno\n12.345.678-9,Maria,Gonzalez,Perez\n9.876.543-2,Juan,Perez,Lopez";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_socias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Global Nav Listener to prevent jumps
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Stop jump to top
            const href = link.getAttribute('href');
            // Extract view ID if it's a hash
            if (href && href.startsWith('#')) {
                // If onclick is present it handles the view, we just stop the default anchor behavior
            }

            // Mobile sidebar collapse logic is already in showView, but we ensure it here too
            if (window.innerWidth <= 768) {
                // Wait for view change then collapse
                setTimeout(() => {
                    document.querySelector('.sidebar').classList.add('collapsed');
                }, 100);
            }
        });
    });
});


// Manual Save for Socias
function manualSaveSocias() {
    if (!confirm('¿Desea guardar los cambios realizados en la nómina?')) return;

    // In a real app with backend, this would POST data. 
    // Here we ensure localStorage is sync (which happens automatically on array mod, but good for user feedback)
    localStorage.setItem('usuarios', JSON.stringify(getSocias()));

    if (driveIntegration) {
        driveIntegration.syncData().then(() => {
            alert('Información guardada y sincronizada correctamente.');
        }).catch(err => {
            console.error(err);
            alert('Información guardada localmente. Error al sincronizar con Drive.');
        });
    } else {
        alert('Información guardada localmente.');
    }
}
function searchSociaForCert(query) {
    const resultsDiv = document.getElementById('certSociaResults');
    if (!query || query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const socias = getSocias();
    const filtered = socias.filter(s => s.rut.includes(query) || (s.nombres + ' ' + s.apellidoPaterno).toLowerCase().includes(query.toLowerCase()));

    if (filtered.length > 0) {
        resultsDiv.innerHTML = filtered.map(s => `
            <div style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;" onclick="selectSociaForCert('${s.rut}', '${s.nombres} ${s.apellidoPaterno} ${s.apellidoMaterno || ''}')">
                <strong>${s.nombres} ${s.apellidoPaterno}</strong><br>
                <small>${s.rut}</small>
            </div>
        `).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

function selectSociaForCert(rut, nombre) {
    document.getElementById('certSociaRut').value = rut;
    document.getElementById('certSelectedSocia').value = rut;
    document.getElementById('certSelectedName').textContent = nombre;
    document.getElementById('certSociaResults').style.display = 'none';
}

function generateCertificate() {
    const rut = document.getElementById('certSelectedSocia').value;
    const nombre = document.getElementById('certSelectedName').textContent;

    if (!rut) {
        alert('Por favor selecciona una socia primero.');
        return;
    }

    const docWindow = window.open('', '_blank');
    docWindow.document.write(`
        <html>
        <head>
            <title>Certificado de Afiliación</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 50px; }
                .title { font-size: 24px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
                .content { text-align: justify; font-size: 14pt; margin-bottom: 60px; }
                .footer { margin-top: 100px; display: flex; justify-content: space-between; padding: 0 50px; }
                .signature { text-align: center; border-top: 1px solid black; width: 200px; padding-top: 10px; }
                .date { text-align: right; margin-top: 40px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>SINDICATO SINTRAMAE</h2>
                <p>Certificado de Afiliación</p>
            </div>
            
            <div class="content">
                <p>Se certifica que <strong>${nombre}</strong>, RUT <strong>${rut}</strong>, es socia activa del Sindicato SINTRAMAE a la fecha.</p>
                <p>El presente certificado se expide a solicitud de la interesada para los fines que estime conveniente.</p>
            </div>
            
            <div class="date">
                Valdivia, ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div class="footer">
                <div class="signature">
                    Firma Presidenta
                </div>
                <div class="signature">
                    Timbre Sindicato
                </div>
            </div>
            
            <script>window.print();</script>
        </body>
        </html>
    `);
    docWindow.document.close();
}

function generateConvenio() {
    const nombre = document.getElementById('convSocia').value;
    const comercio = document.getElementById('convComercio').value;
    const monto = document.getElementById('convMonto').value;
    const cuotas = document.getElementById('convCuotas').value;

    if (!nombre || !comercio || !monto || !cuotas) {
        alert('Por favor completa todos los campos.');
        return;
    }

    const docWindow = window.open('', '_blank');
    docWindow.document.write(`
        <html>
        <head>
            <title>Documento de Convenio</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .title { font-size: 20px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
                .content { margin-bottom: 40px; font-size: 12pt; }
                .details-box { border: 1px solid #ccc; padding: 20px; margin: 20px 0; background: #f9f9f9; }
                .signatures { margin-top: 80px; display: flex; justify-content: space-between; }
                .sig-block { text-align: center; width: 200px; border-top: 1px solid black; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>SINTRAMAE</h2>
                <p>Convenio de Descuento por Planilla</p>
            </div>

            <div class="content">
                <p>Yo, <strong>${nombre}</strong>, autorizo el descuento de mi remuneración mensual según el siguiente detalle:</p>
                
                <div class="details-box">
                    <p><strong>Comercio / Entidad:</strong> ${comercio}</p>
                    <p><strong>Monto Total:</strong> $${parseInt(monto).toLocaleString('es-CL')}</p>
                    <p><strong>Número de Cuotas:</strong> ${cuotas}</p>
                    <p><strong>Valor Cuota Aprox:</strong> $${Math.round(monto / cuotas).toLocaleString('es-CL')}</p>
                </div>

                <p>Este documento sirve como respaldo para el descuento mensual correspondiente.</p>
            </div>

            <div class="signatures">
                <div class="sig-block">
                    Firma Socia
                    <br><small>${nombre}</small>
                </div>
                <div class="sig-block">
                    V°B° Tesorería SINTRAMAE
                </div>
            </div>
            
            <script>window.print();</script>
        </body>
        </html>
    `);
    docWindow.document.close();
}

// ===================================
// CSV Import Logic
// ===================================
document.getElementById('csvFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== '');

        let newSocias = 0;
        let errors = 0;
        const socias = getSocias();

        // Skip header if present (simple check)
        const startIndex = rows[0].toLowerCase().includes('rut') ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
            // Detect delimiter (comma or semicolon)
            const rowStr = rows[i];
            const delimiter = rowStr.includes(';') ? ';' : ',';
            const cols = rowStr.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

            // Expected format: RUT, Nombres, ApellidoPaterno, ApellidoMaterno
            if (cols.length >= 2) {
                const rut = cleanRUT(cols[0]);
                if (validateRUT(rut)) {
                    // Check if exists
                    const exists = socias.findIndex(s => cleanRUT(s.rut) === rut);

                    const newSocia = {
                        rut: formatRUT(rut),
                        nombres: cols[1] || 'Socia Importada',
                        // In case columns are missing, fallback gracefully
                        apellidoPaterno: cols[2] || '',
                        apellidoMaterno: cols[3] || '',
                        email: '', // Default empty as per request
                        estado: 'Activo', // Default active
                        fechaIngreso: new Date().toISOString().split('T')[0]
                    };

                    if (exists >= 0) {
                        socias[exists] = { ...socias[exists], ...newSocia };
                    } else {
                        socias.push(newSocia);
                        newSocias++;
                    }
                } else {
                    errors++;
                }
            }
        }

        if (newSocias > 0 || errors === 0) {
            localStorage.setItem('usuarios', JSON.stringify(socias));
            loadSocias();
            initializeDashboard();
            alert(`Importación completada.\nNuevas socias: ${newSocias}\nErrores: ${errors}`);
            closeModal('importarModal');
        } else {
            alert(`Hubo errores en la importación. Errores: ${errors}`);
        }
    };
    reader.readAsText(file);
});

// ===================================
// Enrolment QR Logic
// ===================================
let enrolScanner = null;

function showEnrolarModal() {
    document.getElementById('enrolarModal').style.display = 'flex';
    lucide.createIcons();
    startEnrolScanner();
}

function closeEnrolarModal() {
    document.getElementById('enrolarModal').style.display = 'none';
    stopEnrolScanner();
}

function startEnrolScanner() {
    if (enrolScanner) return;

    if (!document.getElementById('enrolarReader')) return;

    enrolScanner = new Html5Qrcode("enrolarReader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    enrolScanner.start(
        { facingMode: "environment" },
        config,
        onEnrolScanSuccess
    ).catch(err => {
        console.error("Error starting enrol scanner", err);
        alert("No se pudo iniciar la cámara.");
    });
}

function stopEnrolScanner() {
    if (enrolScanner) {
        enrolScanner.stop().then(() => {
            enrolScanner.clear();
            enrolScanner = null;
        }).catch(err => console.error("Failed to stop scanner", err));
    }
}

function onEnrolScanSuccess(decodedText) {
    console.log(`Enrol scan result: ${decodedText}`);

    let rut = null;

    try {
        const url = new URL(decodedText);
        const params = new URLSearchParams(url.search);
        if (params.has('run')) rut = params.get('run');
        else if (params.has('RUN')) rut = params.get('RUN');
    } catch (e) {
        // format logic if needed
        const RUT_REGEX = /^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/;
        if (RUT_REGEX.test(decodedText)) {
            rut = decodedText;
        }
    }

    if (rut) {
        stopEnrolScanner();
        closeEnrolarModal();

        // Open New Socia Modal and fill RUT
        showNuevaSociaModal();

        // Wait for modal to open then fill
        setTimeout(() => {
            const rutInput = document.getElementById('sociaRut');
            if (rutInput) {
                // Formatting helper
                const clean = rut.replace(/[^0-9kK]/g, '');
                let formatted = clean;
                if (clean.length > 1) {
                    const body = clean.slice(0, -1);
                    const dv = clean.slice(-1).toUpperCase();
                    let fBody = '';
                    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
                        if (j > 0 && j % 3 === 0) fBody = '.' + fBody;
                        fBody = body[i] + fBody;
                    }
                    formatted = fBody + '-' + dv;
                }
                rutInput.value = formatted;
            }
        }, 300);

        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.play().catch(e => { });
    }
}
