// ===================================
// APP Asistencia - Admin Logic v3
// Firebase + Asambleas + Justificaciones + Reportes
// ===================================

// Admin credentials
const ADMIN_CREDENTIALS = {
    email: 'administracion@gmail.com',
    password: 'demo123'
};

// Global state
let currentAsambleaId = null;
let justificacionesData = [];

// ===================
// Authentication
// ===================

if (document.getElementById('loginForm') || document.querySelector('.login-page')) {
    // On login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
                sessionStorage.setItem('adminLoggedIn', 'true');
                sessionStorage.setItem('adminEmail', email);
                window.location.href = 'admin.html';
            } else {
                const errorMessage = document.getElementById('errorMessage');
                const msgElement = errorMessage.querySelector('span');
                msgElement.textContent = 'Credenciales incorrectas.';
                errorMessage.style.display = 'flex';
                lucide.createIcons();
            }
        });
    }
}

// Admin page check
if (document.querySelector('.admin-page')) {
    if (!sessionStorage.getItem('adminLoggedIn')) {
        window.location.href = 'admin-login.html';
    }

    const adminEmail = sessionStorage.getItem('adminEmail');
    if (adminEmail) {
        document.getElementById('adminEmail').textContent = adminEmail;
    }
}

// ===================
// RUT Utilities
// ===================

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

// ===================
// Local Storage Functions
// ===================

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

function getAsambleas() {
    const asambleas = localStorage.getItem('asambleas');
    return asambleas ? JSON.parse(asambleas) : [];
}

function saveAsamblea(asamblea) {
    const asambleas = getAsambleas();
    asamblea.id = Date.now().toString();
    asamblea.estado = 'Activa';
    asamblea.asistencias = {};
    asamblea.accessToken = generateAccessToken();
    asambleas.push(asamblea);
    localStorage.setItem('asambleas', JSON.stringify(asambleas));
    
    // Also save to Firebase
    if (realtimeDB) {
        realtimeDB.ref(`asambleas/${asamblea.id}`).set(asamblea);
    }
    
    return asamblea;
}

function getJustificaciones() {
    const justificaciones = localStorage.getItem('justificaciones');
    return justificaciones ? JSON.parse(justificaciones) : [];
}

function saveJustificacion(justificacion) {
    const justificaciones = getJustificaciones();
    justificacion.id = Date.now().toString();
    justificacion.fecha = new Date().toLocaleDateString('es-CL');
    justificaciones.push(justificacion);
    localStorage.setItem('justificaciones', JSON.stringify(justificaciones));
    return justificacion;
}

function deleteAsambleaLocal(asambleaId) {
    let asambleas = getAsambleas();
    asambleas = asambleas.filter(a => a.id !== asambleaId);
    localStorage.setItem('asambleas', JSON.stringify(asambleas));
}

// ===================
// Utility Functions
// ===================

function generateAccessToken() {
    return 'TOKEN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function generateQRCode(text, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
        new QRCode(container, {
            text: text,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

// ===================
// Dashboard
// ===================

function initializeDashboard() {
    const socias = getSocias();
    const asambleas = getAsambleas();
    
    let totalAsistencias = 0;
    let todayAsistencias = 0;
    const today = new Date().toLocaleDateString('es-CL');

    asambleas.forEach(asamblea => {
        const asistencias = asamblea.asistencias || {};
        totalAsistencias += Object.keys(asistencias).length;
        
        Object.values(asistencias).forEach(a => {
            if (a.fecha === today) todayAsistencias++;
        });
    });

    document.getElementById('totalSocias').textContent = socias.length;
    document.getElementById('totalAsambleas').textContent = asambleas.filter(a => a.estado === 'Activa').length;
    document.getElementById('attendanceToday').textContent = todayAsistencias;
    document.getElementById('totalAttendance').textContent = totalAsistencias;

    // Recent attendance
    let recentAttendances = [];
    asambleas.forEach(asamblea => {
        const asistencias = asamblea.asistencias || {};
        Object.values(asistencias).forEach(a => {
            recentAttendances.push({
                ...a,
                asambleaNombre: asamblea.nombre
            });
        });
    });

    recentAttendances = recentAttendances
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    const recentList = document.getElementById('recentAttendance');
    if (recentList) {
        recentList.innerHTML = recentAttendances.map(a => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <p class="recent-item-name">${a.nombreCompleto}</p>
                    <p class="recent-item-rut">${formatRUT(a.rut)} - ${a.asambleaNombre}</p>
                </div>
                <p class="recent-item-time">${a.hora}</p>
            </div>
        `).join('');

        if (recentAttendances.length === 0) {
            recentList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px;">Sin asistencias aún</p>';
        }
    }

    // Upcoming asambleas
    const upcomingAsambleas = asambleas
        .filter(a => a.estado === 'Activa')
        .slice(0, 5);

    const upcomingList = document.getElementById('upcomingAsambleas');
    if (upcomingList) {
        upcomingList.innerHTML = upcomingAsambleas.map(a => `
            <div class="upcoming-item">
                <p class="upcoming-name">${a.nombre}</p>
                <p class="upcoming-date">${a.fecha} a las ${a.hora}</p>
            </div>
        `).join('');

        if (upcomingAsambleas.length === 0) {
            upcomingList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px;">Sin asambleas programadas</p>';
        }
    }
}

// ===================
// Socias Management
// ===================

function loadSocias() {
    const socias = getSocias();
    const tbody = document.getElementById('sociasTableBody');

    if (!tbody) return;

    if (socias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #9ca3af;">No hay socias registradas</td></tr>';
        return;
    }

    tbody.innerHTML = socias.map(socia => `
        <tr>
            <td>${formatRUT(socia.rut)}</td>
            <td>${socia.nombres || socia.nombre || ''} ${socia.apellidoPaterno || ''}</td>
            <td>${socia.email || '-'}</td>
            <td>
                <span style="background: ${socia.estado === 'Activo' ? '#dcfce7' : '#fee2e2'}; 
                            color: ${socia.estado === 'Activo' ? '#166534' : '#991b1b'}; 
                            padding: 5px 12px; 
                            border-radius: 20px; 
                            font-size: 0.8rem; 
                            font-weight: 600;">
                    ${socia.estado || 'Activo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-delete" onclick="deleteSociaConfirm('${socia.rut}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function filterSocias() {
    const query = document.getElementById('searchSocias')?.value.toLowerCase() || '';
    const socias = getSocias();
    const filtered = socias.filter(s => 
        s.rut.toLowerCase().includes(query) || 
        (s.nombres || s.nombre || '').toLowerCase().includes(query)
    );

    const tbody = document.getElementById('sociasTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(socia => `
        <tr>
            <td>${formatRUT(socia.rut)}</td>
            <td>${socia.nombres || socia.nombre || ''} ${socia.apellidoPaterno || ''}</td>
            <td>${socia.email || '-'}</td>
            <td>
                <span style="background: ${socia.estado === 'Activo' ? '#dcfce7' : '#fee2e2'}; 
                            color: ${socia.estado === 'Activo' ? '#166534' : '#991b1b'}; 
                            padding: 5px 12px; 
                            border-radius: 20px; 
                            font-size: 0.8rem; 
                            font-weight: 600;">
                    ${socia.estado || 'Activo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-delete" onclick="deleteSociaConfirm('${socia.rut}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #9ca3af;">No se encontraron socias</td></tr>';
    }

    lucide.createIcons();
}

function openAddSociaForm() {
    document.getElementById('addSociaModal').style.display = 'flex';
}

function closeAddSociaForm() {
    document.getElementById('addSociaModal').style.display = 'none';
    document.getElementById('addSociaForm').reset();
}

document.getElementById('addSociaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const rut = document.getElementById('newRut').value;
    const nombres = document.getElementById('newNombre').value;
    const email = document.getElementById('newEmail').value;

    if (!rut || !nombres) {
        alert('Rellena todos los campos requeridos');
        return;
    }

    const socia = {
        rut: rut,
        nombres: nombres,
        apellidoPaterno: '',
        apellidoMaterno: '',
        email: email,
        estado: 'Activo'
    };

    saveSocia(socia);
    loadSocias();
    closeAddSociaForm();
    initializeDashboard();
});

function deleteSociaConfirm(rut) {
    if (confirm('¿Estás seguro de que deseas eliminar esta socia?')) {
        deleteSocia(rut);
        loadSocias();
        initializeDashboard();
    }
}

// ===================
// Asambleas Management
// ===================

function loadAsambleas() {
    const asambleas = getAsambleas();
    const tbody = document.getElementById('asambleasTableBody');

    if (!tbody) return;

    if (asambleas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #9ca3af;">No hay asambleas creadas</td></tr>';
        return;
    }

    tbody.innerHTML = asambleas.map(asamblea => `
        <tr>
            <td><strong>${asamblea.nombre}</strong></td>
            <td>${asamblea.fecha}</td>
            <td>
                <span style="background: ${asamblea.estado === 'Activa' ? '#dcfce7' : '#fee2e2'}; 
                            color: ${asamblea.estado === 'Activa' ? '#166534' : '#991b1b'}; 
                            padding: 5px 12px; 
                            border-radius: 20px; 
                            font-size: 0.8rem; 
                            font-weight: 600;">
                    ${asamblea.estado}
                </span>
            </td>
            <td><strong>${Object.keys(asamblea.asistencias || {}).length}</strong></td>
            <td>
                <button class="btn-action-small" onclick="showQRModal('${asamblea.id}', '${asamblea.nombre}')">
                    <i data-lucide="qr-code"></i>
                </button>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="toggleAsambleaStatus('${asamblea.id}')">
                        <i data-lucide="${asamblea.estado === 'Activa' ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteAsambleaConfirm('${asamblea.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();

    // Update select dropdowns
    updateAsambleaSelects();
}

function openCreateAsambleaForm() {
    document.getElementById('createAsambleaModal').style.display = 'flex';
}

function closeCreateAsambleaForm() {
    document.getElementById('createAsambleaModal').style.display = 'none';
    document.getElementById('createAsambleaForm').reset();
}

document.getElementById('createAsambleaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const asamblea = {
        nombre: document.getElementById('asambleaNombre').value,
        fecha: document.getElementById('asambleaFecha').value,
        hora: document.getElementById('asambleaHora').value,
        descripcion: document.getElementById('asambleaDescripcion').value,
        fechaCreacion: new Date().toISOString()
    };

    saveAsamblea(asamblea);
    loadAsambleas();
    closeCreateAsambleaForm();
    initializeDashboard();
});

function toggleAsambleaStatus(asambleaId) {
    let asambleas = getAsambleas();
    const index = asambleas.findIndex(a => a.id === asambleaId);
    
    if (index !== -1) {
        asambleas[index].estado = asambleas[index].estado === 'Activa' ? 'Inactiva' : 'Activa';
        localStorage.setItem('asambleas', JSON.stringify(asambleas));
        loadAsambleas();
        initializeDashboard();
    }
}

function deleteAsambleaConfirm(asambleaId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta asamblea?')) {
        deleteAsambleaLocal(asambleaId);
        loadAsambleas();
        initializeDashboard();
    }
}

function updateAsambleaSelects() {
    const asambleas = getAsambleas();
    
    // Update asistencias select
    const filterSelect = document.getElementById('filterAsambleaAsistencias');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todas las asambleas</option>' +
            asambleas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
    }

    // Update justificaciones select
    const justSelect = document.getElementById('justAsambleaSelect');
    if (justSelect) {
        justSelect.innerHTML = '<option value="">Selecciona una asamblea</option>' +
            asambleas.filter(a => a.estado === 'Activa').map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
    }

    // Update reportes selects
    const reportSelect1 = document.getElementById('reportAsambleaSelect');
    if (reportSelect1) {
        reportSelect1.innerHTML = '<option value="">Selecciona una asamblea</option>' +
            asambleas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
    }

    const reportSelect2 = document.getElementById('reportExportAsambleaSelect');
    if (reportSelect2) {
        reportSelect2.innerHTML = '<option value="">Todas las asambleas</option>' +
            asambleas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
    }
}

// ===================
// QR Management
// ===================

function showQRModal(asambleaId, nombre) {
    const asamblea = getAsambleas().find(a => a.id === asambleaId);
    if (!asamblea) return;

    const modal = document.getElementById('qrModal');
    document.getElementById('qrTitle').textContent = `Código QR: ${nombre}`;
    document.getElementById('qrAccessToken').textContent = asamblea.accessToken;
    
    // Generate QR with access token
    const qrUrl = `${window.location.origin}/acceso.html?token=${asamblea.accessToken}&asambleaId=${asambleaId}`;
    generateQRCode(qrUrl, 'qrCodeContainer');
    
    modal.style.display = 'flex';
    lucide.createIcons();
}

function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
}

function copyQRToken() {
    const token = document.getElementById('qrAccessToken').textContent;
    navigator.clipboard.writeText(token).then(() => {
        alert('Código copiado al portapapeles');
    });
}

// ===================
// Asistencias
// ===================

function loadAsistencias() {
    const asambleas = getAsambleas();
    const tbody = document.getElementById('attendanceTableBody');

    if (!tbody) return;

    let allAsistencias = [];

    asambleas.forEach(asamblea => {
        const asistencias = asamblea.asistencias || {};
        Object.values(asistencias).forEach(a => {
            allAsistencias.push({
                ...a,
                asambleaId: asamblea.id,
                asambleaNombre: asamblea.nombre
            });
        });
    });

    allAsistencias = allAsistencias.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    if (allAsistencias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #9ca3af;">No hay asistencias registradas</td></tr>';
        return;
    }

    tbody.innerHTML = allAsistencias.map(a => `
        <tr>
            <td>${a.asambleaNombre}</td>
            <td>${a.fecha}</td>
            <td>${a.hora}</td>
            <td>${formatRUT(a.rut)}</td>
            <td>${a.nombreCompleto}</td>
        </tr>
    `).join('');
}

function filterAsistencias() {
    const asambleaId = document.getElementById('filterAsambleaAsistencias')?.value || '';
    const filterDate = document.getElementById('filterDate')?.value || '';
    const filterRut = document.getElementById('filterRut')?.value.toLowerCase() || '';

    const asambleas = getAsambleas();
    let allAsistencias = [];

    asambleas.forEach(asamblea => {
        if (asambleaId && asamblea.id !== asambleaId) return;
        
        const asistencias = asamblea.asistencias || {};
        Object.values(asistencias).forEach(a => {
            allAsistencias.push({
                ...a,
                asambleaId: asamblea.id,
                asambleaNombre: asamblea.nombre
            });
        });
    });

    if (filterDate) {
        const date = new Date(filterDate).toLocaleDateString('es-CL');
        allAsistencias = allAsistencias.filter(a => a.fecha === date);
    }

    if (filterRut) {
        allAsistencias = allAsistencias.filter(a => a.rut.toLowerCase().includes(filterRut));
    }

    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    const sorted = allAsistencias.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    tbody.innerHTML = sorted.map(a => `
        <tr>
            <td>${a.asambleaNombre}</td>
            <td>${a.fecha}</td>
            <td>${a.hora}</td>
            <td>${formatRUT(a.rut)}</td>
            <td>${a.nombreCompleto}</td>
        </tr>
    `).join('');

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #9ca3af;">No se encontraron asistencias</td></tr>';
    }
}

// ===================
// Justificaciones
// ===================

function loadJustificaciones() {
    const justificaciones = getJustificaciones();
    justificacionesData = justificaciones;
    renderJustificacionesTable(justificaciones);

    // Update reportes select
    const reportSelect = document.getElementById('reportJustificacionSelect');
    if (reportSelect) {
        reportSelect.innerHTML = '<option value="">Selecciona una justificación</option>' +
            justificaciones.map(j => `<option value="${j.id}">${j.nombreCompleto} - ${j.asambleaNombre}</option>`).join('');
    }
}

function renderJustificacionesTable(justificaciones) {
    const tbody = document.getElementById('justificacionesTableBody');

    if (!tbody) return;

    if (justificaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #9ca3af;">No hay justificaciones registradas</td></tr>';
        return;
    }

    tbody.innerHTML = justificaciones.map(j => `
        <tr>
            <td>${formatRUT(j.rut)}</td>
            <td>${j.nombreCompleto}</td>
            <td>${j.asambleaNombre}</td>
            <td>${j.motivo.substring(0, 30)}...</td>
            <td>${j.fecha}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-delete" onclick="deleteJustificacion('${j.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function filterJustificaciones() {
    const query = document.getElementById('searchJustificaciones')?.value.toLowerCase() || '';
    const filtered = justificacionesData.filter(j => 
        j.rut.toLowerCase().includes(query) || 
        j.nombreCompleto.toLowerCase().includes(query)
    );

    renderJustificacionesTable(filtered);
}

function openJustificacionForm() {
    document.getElementById('justificacionModal').style.display = 'flex';
    loadAsambleasForJustificacion();
}

function closeJustificacionForm() {
    document.getElementById('justificacionModal').style.display = 'none';
    document.getElementById('justificacionForm').reset();
    document.getElementById('selectedSociaInfo').style.display = 'none';
}

function loadAsambleasForJustificacion() {
    const asambleas = getAsambleas();
    const select = document.getElementById('justAsambleaSelect');
    select.innerHTML = '<option value="">Selecciona una asamblea</option>' +
        asambleas.filter(a => a.estado === 'Activa').map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
}

function searchSociaForJustificacion() {
    const query = document.getElementById('justRut')?.value.toLowerCase() || '';
    const socias = getSocias();
    const resultsContainer = document.getElementById('sociasSearchResults');

    if (!query) {
        resultsContainer.innerHTML = '';
        return;
    }

    const filtered = socias.filter(s => 
        s.rut.toLowerCase().includes(query) || 
        (s.nombres || s.nombre || '').toLowerCase().includes(query)
    );

    resultsContainer.innerHTML = filtered.map(s => `
        <div class="search-result-item" onclick="selectSociaForJustificacion('${s.rut}', '${s.nombres || s.nombre || ''} ${s.apellidoPaterno || ''}')">
            <strong>${s.nombres || s.nombre || ''} ${s.apellidoPaterno || ''}</strong>
            <small>${formatRUT(s.rut)}</small>
        </div>
    `).join('');
}

function selectSociaForJustificacion(rut, nombre) {
    document.getElementById('selectedSociaRut').value = rut;
    document.getElementById('selectedSociaNombre').textContent = nombre;
    document.getElementById('selectedSociaRutDisplay').textContent = formatRUT(rut);
    document.getElementById('selectedSociaInfo').style.display = 'block';
    document.getElementById('sociasSearchResults').innerHTML = '';
}

document.getElementById('justificacionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const rut = document.getElementById('selectedSociaRut').value;
    const asambleaId = document.getElementById('justAsambleaSelect').value;
    const motivo = document.getElementById('justMotivo').value;

    if (!rut || !asambleaId || !motivo) {
        alert('Rellena todos los campos requeridos');
        return;
    }

    const asamblea = getAsambleas().find(a => a.id === asambleaId);
    const socia = getSocias().find(s => cleanRUT(s.rut) === cleanRUT(rut));

    const justificacion = {
        rut: rut,
        nombreCompleto: socia?.nombres || socia?.nombre || '',
        asambleaId: asambleaId,
        asambleaNombre: asamblea?.nombre || '',
        motivo: motivo
    };

    saveJustificacion(justificacion);
    loadJustificaciones();
    closeJustificacionForm();
});

function deleteJustificacion(justId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta justificación?')) {
        let justificaciones = getJustificaciones();
        justificaciones = justificaciones.filter(j => j.id !== justId);
        localStorage.setItem('justificaciones', JSON.stringify(justificaciones));
        loadJustificaciones();
    }
}

// ===================
// Reportes e Impresión
// ===================

function printAsambleaReport() {
    const asambleaId = document.getElementById('reportAsambleaSelect')?.value;
    if (!asambleaId) {
        alert('Selecciona una asamblea');
        return;
    }

    const asamblea = getAsambleas().find(a => a.id === asambleaId);
    if (!asamblea) return;

    const asistencias = Object.values(asamblea.asistencias || {});

    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${asamblea.nombre}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; color: #333; }
                .info { text-align: center; margin-bottom: 30px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #667eea; color: white; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>${asamblea.nombre}</h1>
            <div class="info">
                <p><strong>Fecha:</strong> ${asamblea.fecha}</p>
                <p><strong>Hora:</strong> ${asamblea.hora}</p>
                <p><strong>Total de Asistentes:</strong> ${asistencias.length}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>RUT</th>
                        <th>Nombre</th>
                        <th>Hora de Asistencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${asistencias.map((a, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${formatRUT(a.rut)}</td>
                            <td>${a.nombreCompleto}</td>
                            <td>${a.hora}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <p>Reporte generado: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

function printJustificacionReport() {
    const justId = document.getElementById('reportJustificacionSelect')?.value;
    if (!justId) {
        alert('Selecciona una justificación');
        return;
    }

    const justificacion = getJustificaciones().find(j => j.id === justId);
    if (!justificacion) return;

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Justificación</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 600px; margin: 0 auto; border: 2px solid #667eea; padding: 30px; }
                h1 { text-align: center; color: #667eea; margin-bottom: 30px; }
                .field { margin-bottom: 20px; }
                .field-label { font-weight: bold; color: #333; }
                .field-value { color: #666; margin-top: 5px; }
                .footer { margin-top: 50px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #999; font-size: 12px; }
                .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 50px; margin-left: 0; text-align: center; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>JUSTIFICACIÓN DE AUSENCIA</h1>
                
                <div class="field">
                    <div class="field-label">Socia:</div>
                    <div class="field-value">${justificacion.nombreCompleto}</div>
                </div>

                <div class="field">
                    <div class="field-label">RUT:</div>
                    <div class="field-value">${formatRUT(justificacion.rut)}</div>
                </div>

                <div class="field">
                    <div class="field-label">Asamblea:</div>
                    <div class="field-value">${justificacion.asambleaNombre}</div>
                </div>

                <div class="field">
                    <div class="field-label">Motivo de Ausencia:</div>
                    <div class="field-value">${justificacion.motivo}</div>
                </div>

                <div class="field">
                    <div class="field-label">Fecha de Registro:</div>
                    <div class="field-value">${justificacion.fecha}</div>
                </div>

                <div class="signature-line"></div>
                <p style="text-align: center; margin-top: 10px; font-size: 12px; color: #999;">Firma Socia</p>

                <div class="footer">
                    <p>Documento generado por APP Asistencia</p>
                    <p>${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

function exportToExcel() {
    const asambleaId = document.getElementById('reportExportAsambleaSelect')?.value || '';
    const asambleas = getAsambleas();

    let selectedAsambleas = asambleaId ? 
        asambleas.filter(a => a.id === asambleaId) : 
        asambleas;

    const data = [['Asamblea', 'Fecha', 'RUT', 'Nombre', 'Hora']];

    selectedAsambleas.forEach(asamblea => {
        const asistencias = Object.values(asamblea.asistencias || {});
        asistencias.forEach(a => {
            data.push([
                asamblea.nombre,
                a.fecha,
                a.rut,
                a.nombreCompleto,
                a.hora
            ]);
        });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');

    XLSX.writeFile(workbook, `asistencias-${new Date().toLocaleDateString('es-CL')}.xlsx`);
}

// ===================
// Importar Datos
// ===================

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rows.length < 2) {
                alert('El archivo está vacío o no tiene datos válidos');
                return;
            }

            const socias = getSocias();
            let imported = 0;
            let duplicated = 0;

            for (let i = 1; i < rows.length; i++) {
                const [rut, nombre] = rows[i];

                if (!rut || !nombre) continue;

                const exists = socias.find(s => cleanRUT(s.rut) === cleanRUT(rut));

                if (!exists) {
                    socias.push({
                        rut: rut.toString().trim(),
                        nombres: nombre.toString().trim(),
                        apellidoPaterno: '',
                        apellidoMaterno: '',
                        email: '',
                        estado: 'Activo'
                    });
                    imported++;
                } else {
                    duplicated++;
                }
            }

            localStorage.setItem('usuarios', JSON.stringify(socias));

            const resultContent = document.getElementById('resultContent');
            resultContent.innerHTML = `
                <div style="text-align: center; color: #10b981; margin-bottom: 15px;">
                    <i data-lucide="check-circle" style="width: 50px; height: 50px;"></i>
                </div>
                <h3 style="color: var(--dark); margin-bottom: 10px;">Importación Completada</h3>
                <p style="color: #6b7280; margin: 8px 0;"><strong>${imported}</strong> socias importadas</p>
                ${duplicated > 0 ? `<p style="color: #f59e0b; margin: 8px 0;"><strong>${duplicated}</strong> registros duplicados (ignorados)</p>` : ''}
            `;

            document.getElementById('importResult').style.display = 'block';

            loadSocias();
            initializeDashboard();

            document.getElementById('excelFile').value = '';

            lucide.createIcons();

            setTimeout(() => {
                document.getElementById('importResult').style.display = 'none';
            }, 3000);

        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar el archivo: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

// ===================
// Tab Navigation
// ===================

function showTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const tabElement = document.getElementById(tabName + '-tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }

    event.target.closest('.menu-item')?.classList.add('active');

    // Refresh data
    if (tabName === 'dashboard') {
        initializeDashboard();
    } else if (tabName === 'socias') {
        loadSocias();
    } else if (tabName === 'asambleas') {
        loadAsambleas();
    } else if (tabName === 'asistencias') {
        loadAsistencias();
    } else if (tabName === 'justificaciones') {
        loadJustificaciones();
    }
}

// ===================
// Logout
// ===================

function logout() {
    if (confirm('¿Deseas cerrar sesión?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminEmail');
        window.location.href = 'admin-login.html';
    }
}
