// ===================================
// Meeting-Attendance Integration
// Funciones para vincular reuniones con asistencia
// ===================================

// Crear reunión con matriz de asistencia
function crearReunionConMatriz(nombre, fecha, hora) {
    const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    const socias = getSocias();

    const newMeeting = {
        id: 'reunion_' + Date.now(),
        nombre: nombre,
        fecha: fecha,
        hora: hora,
        estado: 'Activa',
        asistencias: {}
    };

    // Inicializar matriz con todas las socias
    socias.forEach(socia => {
        newMeeting.asistencias[socia.rut] = {
            estado: 'Pendiente',
            hora: null,
            justificacion: null
        };
    });

    meetings.push(newMeeting);
    localStorage.setItem('meetings', JSON.stringify(meetings));

    return newMeeting;
}

// Cerrar reunión y marcar ausencias
function cerrarReunion(meetingId) {
    const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting) return false;

    // Marcar como "No asistió" a todas las socias pendientes
    Object.keys(meeting.asistencias).forEach(rut => {
        if (meeting.asistencias[rut].estado === 'Pendiente') {
            meeting.asistencias[rut].estado = 'No asistió';
        }
    });

    meeting.estado = 'Cerrada';
    localStorage.setItem('meetings', JSON.stringify(meetings));

    return true;
}

// Justificar asistencia
function justificarAsistencia(meetingId, sociaRut, justificacion) {
    const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting || !meeting.asistencias[sociaRut]) return false;

    meeting.asistencias[sociaRut].justificacion = justificacion;
    meeting.asistencias[sociaRut].estado = 'Justificado';

    localStorage.setItem('meetings', JSON.stringify(meetings));
    return true;
}

// Obtener matriz de asistencia de una reunión
function getMatrizAsistencia(meetingId) {
    const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting) return null;

    const socias = getSocias();
    const matriz = [];

    socias.forEach(socia => {
        const asistencia = meeting.asistencias[socia.rut] || {
            estado: 'Pendiente',
            hora: null,
            justificacion: null
        };

        matriz.push({
            rut: socia.rut,
            nombre: `${socia.nombres} ${socia.apellidoPaterno}`,
            ...asistencia
        });
    });

    return {
        meeting: meeting,
        matriz: matriz
    };
}

// Renderizar matriz de asistencia en UI
function renderMatrizAsistencia(meetingId) {
    const data = getMatrizAsistencia(meetingId);
    if (!data) return;

    const container = document.getElementById('matrizAsistenciaContainer');
    if (!container) return;

    let html = `
        <div class="matriz-header">
            <h3>${data.meeting.nombre}</h3>
            <p>Fecha: ${data.meeting.fecha} - ${data.meeting.hora}</p>
            <p>Estado: <span class="badge-${data.meeting.estado === 'Activa' ? 'success' : 'secondary'}">${data.meeting.estado}</span></p>
        </div>
        
        <table class="tabla-matriz">
            <thead>
                <tr>
                    <th>Socia</th>
                    <th>RUT</th>
                    <th>Estado</th>
                    <th>Hora</th>
                    <th>Justificación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.matriz.forEach(item => {
        const badgeClass = item.estado === 'Asistió' ? 'success' :
            item.estado === 'Justificado' ? 'warning' :
                item.estado === 'No asistió' ? 'danger' : 'secondary';

        html += `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.rut}</td>
                <td><span class="badge-${badgeClass}">${item.estado}</span></td>
                <td>${item.hora || '-'}</td>
                <td>${item.justificacion || '-'}</td>
                <td>
                    ${item.estado !== 'Asistió' ? `
                        <button class="btn-xs btn-secondary" onclick="mostrarModalJustificar('${meetingId}', '${item.rut}')">
                            <i data-lucide="edit"></i> Justificar
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        
        ${data.meeting.estado === 'Activa' ? `
            <div class="matriz-actions">
                <button class="btn-danger" onclick="confirmarCerrarReunion('${meetingId}')">
                    <i data-lucide="lock"></i> Cerrar Reunión
                </button>
            </div>
        ` : ''}
    `;

    container.innerHTML = html;
    lucide.createIcons();
}

// Confirmar cierre de reunión
function confirmarCerrarReunion(meetingId) {
    if (confirm('¿Está segura de cerrar esta reunión? Las socias sin registro se marcarán como "No asistió".')) {
        cerrarReunion(meetingId);
        renderMatrizAsistencia(meetingId);
        alert('Reunión cerrada exitosamente');
    }
}

// Modal para justificar
function mostrarModalJustificar(meetingId, sociaRut) {
    const socia = getSocias().find(s => s.rut === sociaRut);
    if (!socia) return;

    const justificacion = prompt(`Justificar ausencia de ${socia.nombres} ${socia.apellidoPaterno}:`);
    if (justificacion) {
        justificarAsistencia(meetingId, sociaRut, justificacion);
        renderMatrizAsistencia(meetingId);
    }
}
