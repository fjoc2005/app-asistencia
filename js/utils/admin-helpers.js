// ===================================
// Helper Functions for New Features
// Funciones auxiliares para integrar nuevos servicios
// ===================================

// Función auxiliar para obtener socias (alias de getUsuarios)
function getSocias() {
    return JSON.parse(localStorage.getItem('usuarios') || '[]');
}

// Guardar justificación desde modal
function guardarJustificacion() {
    const meetingId = document.getElementById('justificarMeetingId').value;
    const sociaRut = document.getElementById('justificarSociaRut').value;
    const motivo = document.getElementById('justificarMotivo').value;

    if (!motivo.trim()) {
        alert('Por favor ingresa un motivo');
        return;
    }

    justificarAsistencia(meetingId, sociaRut, motivo);
    document.getElementById('modalJustificar').style.display = 'none';

    // Refrescar matriz si está visible
    if (typeof renderMatrizAsistencia === 'function') {
        renderMatrizAsistencia(meetingId);
    }

    alert('Justificación guardada exitosamente');
}

// Mostrar modal de justificación (llamado desde meeting-attendance.js)
function mostrarModalJustificar(meetingId, sociaRut) {
    const socias = getSocias();
    const socia = socias.find(s => s.rut === sociaRut);

    if (!socia) return;

    document.getElementById('justificarMeetingId').value = meetingId;
    document.getElementById('justificarSociaRut').value = sociaRut;
    document.getElementById('justificarSociaNombre').textContent = `${socia.nombres} ${socia.apellidoPaterno}`;
    document.getElementById('justificarMotivo').value = '';

    document.getElementById('modalJustificar').style.display = 'flex';
    lucide.createIcons();
}

// Mostrar modal de estado de socia
function mostrarEstadoSocia(sociaRut) {
    const socia = getSocias().find(s => s.rut === sociaRut);
    if (!socia) return;

    const deuda = calcularDeudaSocia(sociaRut);

    document.getElementById('estadoSociaNombre').textContent = `${socia.nombres} ${socia.apellidoPaterno}`;
    document.getElementById('estadoDeudaTotal').textContent = `$${deuda.deudaTotal.toLocaleString('es-CL')}`;
    document.getElementById('estadoDescuentosVigentes').textContent = deuda.descuentosVigentes;
    document.getElementById('estadoDescuentosFinalizados').textContent = deuda.descuentosFinalizados;

    // Renderizar historial
    const container = document.getElementById('historialDescuentosContainer');
    if (deuda.historial.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay descuentos registrados</p>';
    } else {
        let html = '<table class="data-table"><thead><tr><th>Fecha</th><th>Comercio</th><th>Monto</th><th>Cuotas</th><th>Estado</th></tr></thead><tbody>';

        deuda.historial.forEach(desc => {
            const badgeClass = desc.estado === 'Vigente' ? 'badge-warning' : 'badge-success';
            html += `
                <tr>
                    <td>${new Date(desc.fechaCreacion).toLocaleDateString('es-CL')}</td>
                    <td>${desc.comercio}</td>
                    <td>$${desc.montoTotal.toLocaleString('es-CL')}</td>
                    <td>${desc.cuotasPagadas}/${desc.cuotas}</td>
                    <td><span class="${badgeClass}">${desc.estado}</span></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    document.getElementById('modalEstadoSocia').style.display = 'flex';
    lucide.createIcons();
}

// Poblar select de reuniones para matriz
function poblarSelectReuniones() {
    const select = document.getElementById('selectReunionMatriz');
    if (!select) return;

    const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');

    select.innerHTML = '<option value="">-- Seleccione una reunión --</option>';

    meetings.forEach(meeting => {
        const option = document.createElement('option');
        option.value = meeting.id;
        option.textContent = `${meeting.nombre} - ${meeting.fecha} (${meeting.estado})`;
        select.appendChild(option);
    });
}

// Inicializar funcionalidades nuevas al cargar admin
document.addEventListener('DOMContentLoaded', () => {
    // Poblar select de reuniones si existe
    if (document.getElementById('selectReunionMatriz')) {
        poblarSelectReuniones();
    }
});
