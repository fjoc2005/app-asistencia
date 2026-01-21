// ===================================
// Discount Management System
// Sistema completo de gestión de descuentos y deudas
// ===================================

// Estructura de datos para descuentos
function getDescuentos() {
    return JSON.parse(localStorage.getItem('descuentos') || '[]');
}

function saveDescuentos(descuentos) {
    localStorage.setItem('descuentos', JSON.stringify(descuentos));
}

// Agregar nuevo descuento
function agregarDescuento(sociaRut, datos) {
    const descuentos = getDescuentos();

    const nuevoDescuento = {
        id: 'desc_' + Date.now(),
        sociaRut: sociaRut,
        comercio: datos.comercio,
        montoTotal: parseFloat(datos.montoTotal),
        cuotas: parseInt(datos.cuotas),
        cuotasPagadas: 0,
        montoCuota: parseFloat(datos.montoTotal) / parseInt(datos.cuotas),
        fechaInicio: datos.fechaInicio || new Date().toISOString().split('T')[0],
        fechaCreacion: new Date().toISOString(),
        estado: 'Vigente',
        observaciones: datos.observaciones || ''
    };

    descuentos.push(nuevoDescuento);
    saveDescuentos(descuentos);

    return nuevoDescuento;
}

// Marcar descuento como finalizado
function finalizarDescuento(descuentoId) {
    const descuentos = getDescuentos();
    const descuento = descuentos.find(d => d.id === descuentoId);

    if (descuento) {
        descuento.estado = 'Finalizado';
        descuento.fechaFinalizacion = new Date().toISOString();
        saveDescuentos(descuentos);
        return true;
    }
    return false;
}

// Registrar pago de cuota
function registrarPagoCuota(descuentoId) {
    const descuentos = getDescuentos();
    const descuento = descuentos.find(d => d.id === descuentoId);

    if (descuento && descuento.cuotasPagadas < descuento.cuotas) {
        descuento.cuotasPagadas++;

        if (descuento.cuotasPagadas >= descuento.cuotas) {
            descuento.estado = 'Finalizado';
            descuento.fechaFinalizacion = new Date().toISOString();
        }

        saveDescuentos(descuentos);
        return true;
    }
    return false;
}

// Obtener descuentos de una socia
function getDescuentosSocia(sociaRut) {
    const descuentos = getDescuentos();
    return descuentos.filter(d => d.sociaRut === sociaRut);
}

// Calcular deuda total de una socia
function calcularDeudaSocia(sociaRut) {
    const descuentos = getDescuentosSocia(sociaRut);
    const vigentes = descuentos.filter(d => d.estado === 'Vigente');

    let deudaTotal = 0;
    vigentes.forEach(d => {
        const cuotasPendientes = d.cuotas - d.cuotasPagadas;
        deudaTotal += cuotasPendientes * d.montoCuota;
    });

    return {
        deudaTotal: deudaTotal,
        descuentosVigentes: vigentes.length,
        descuentosFinalizados: descuentos.filter(d => d.estado === 'Finalizado').length,
        historial: descuentos
    };
}

// Generar reporte de deudas mensual
function generarReporteDeudas(mes, anio) {
    const descuentos = getDescuentos();
    const socias = getSocias();

    const reporte = [];

    socias.forEach(socia => {
        const deuda = calcularDeudaSocia(socia.rut);
        if (deuda.deudaTotal > 0) {
            reporte.push({
                rut: socia.rut,
                nombre: `${socia.nombres} ${socia.apellidoPaterno}`,
                deudaTotal: deuda.deudaTotal,
                descuentosVigentes: deuda.descuentosVigentes,
                detalle: deuda.historial.filter(d => d.estado === 'Vigente')
            });
        }
    });

    return reporte;
}

// Renderizar lista de descuentos de una socia
function renderDescuentosSocia(sociaRut) {
    const socia = getSocias().find(s => s.rut === sociaRut);
    if (!socia) return;

    const descuentos = getDescuentosSocia(sociaRut);
    const deuda = calcularDeudaSocia(sociaRut);

    const container = document.getElementById('descuentosSociaContainer');
    if (!container) return;

    let html = `
        <div class="socia-header">
            <h3>${socia.nombres} ${socia.apellidoPaterno} (${socia.rut})</h3>
            <div class="deuda-resumen">
                <p><strong>Deuda Total:</strong> $${deuda.deudaTotal.toLocaleString('es-CL')}</p>
                <p><strong>Descuentos Vigentes:</strong> ${deuda.descuentosVigentes}</p>
            </div>
        </div>
        
        <div class="acciones-socia">
            <button class="btn-primary" onclick="mostrarModalNuevoDescuento('${sociaRut}')">
                <i data-lucide="plus"></i> Agregar Nuevo Descuento
            </button>
            <button class="btn-secondary" onclick="mostrarEstadoSocia('${sociaRut}')">
                <i data-lucide="file-text"></i> Estado de la Socia
            </button>
            <button class="btn-warning" onclick="generarInformeDeudaIndividual('${sociaRut}')">
                <i data-lucide="alert-circle"></i> Generar Informe de Deuda
            </button>
        </div>
        
        <table class="tabla-descuentos">
            <thead>
                <tr>
                    <th>Comercio</th>
                    <th>Monto Total</th>
                    <th>Cuotas</th>
                    <th>Pagadas</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    descuentos.forEach(desc => {
        const saldo = (desc.cuotas - desc.cuotasPagadas) * desc.montoCuota;
        const badgeClass = desc.estado === 'Vigente' ? 'warning' : 'success';

        html += `
            <tr>
                <td>${desc.comercio}</td>
                <td>$${desc.montoTotal.toLocaleString('es-CL')}</td>
                <td>${desc.cuotas}</td>
                <td>${desc.cuotasPagadas}</td>
                <td>$${saldo.toLocaleString('es-CL')}</td>
                <td><span class="badge-${badgeClass}">${desc.estado}</span></td>
                <td>
                    ${desc.estado === 'Vigente' ? `
                        <button class="btn-xs btn-primary" onclick="registrarPagoCuota('${desc.id}'); renderDescuentosSocia('${sociaRut}')">
                            Pagar Cuota
                        </button>
                        <button class="btn-xs btn-danger" onclick="finalizarDescuento('${desc.id}'); renderDescuentosSocia('${sociaRut}')">
                            Finalizar
                        </button>
                    ` : '<span class="text-muted">Finalizado</span>'}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    lucide.createIcons();
}

// Modal para nuevo descuento
function mostrarModalNuevoDescuento(sociaRut) {
    const socia = getSocias().find(s => s.rut === sociaRut);
    if (!socia) return;

    const modal = document.getElementById('modalNuevoDescuento');
    if (!modal) return;

    document.getElementById('descuentoSociaRut').value = sociaRut;
    document.getElementById('descuentoSociaNombre').textContent = `${socia.nombres} ${socia.apellidoPaterno}`;

    modal.style.display = 'flex';
}

// Guardar nuevo descuento desde formulario
function guardarNuevoDescuento() {
    const sociaRut = document.getElementById('descuentoSociaRut').value;
    const datos = {
        comercio: document.getElementById('descuentoComercio').value,
        montoTotal: document.getElementById('descuentoMonto').value,
        cuotas: document.getElementById('descuentoCuotas').value,
        fechaInicio: document.getElementById('descuentoFecha').value,
        observaciones: document.getElementById('descuentoObservaciones').value
    };

    agregarDescuento(sociaRut, datos);
    document.getElementById('modalNuevoDescuento').style.display = 'none';
    renderDescuentosSocia(sociaRut);

    alert('Descuento agregado exitosamente');
}

// Generar informe individual de deuda
function generarInformeDeudaIndividual(sociaRut) {
    const socia = getSocias().find(s => s.rut === sociaRut);
    if (!socia) return;

    const deuda = calcularDeudaSocia(sociaRut);

    const docWindow = window.open('', '_blank');
    docWindow.document.write(`
        <html>
        <head>
            <title>Informe de Deuda - ${socia.nombres} ${socia.apellidoPaterno}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #f4f4f4; }
                .total { font-size: 1.2em; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SINTRAMAE</h1>
                <h2>Informe de Deuda</h2>
            </div>
            
            <p><strong>Socia:</strong> ${socia.nombres} ${socia.apellidoPaterno} ${socia.apellidoMaterno || ''}</p>
            <p><strong>RUT:</strong> ${socia.rut}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CL')}</p>
            
            <h3>Detalle de Descuentos Vigentes</h3>
            <table>
                <tr>
                    <th>Comercio</th>
                    <th>Monto Total</th>
                    <th>Cuotas</th>
                    <th>Pagadas</th>
                    <th>Saldo</th>
                </tr>
                ${deuda.historial.filter(d => d.estado === 'Vigente').map(desc => `
                    <tr>
                        <td>${desc.comercio}</td>
                        <td>$${desc.montoTotal.toLocaleString('es-CL')}</td>
                        <td>${desc.cuotas}</td>
                        <td>${desc.cuotasPagadas}</td>
                        <td>$${((desc.cuotas - desc.cuotasPagadas) * desc.montoCuota).toLocaleString('es-CL')}</td>
                    </tr>
                `).join('')}
            </table>
            
            <p class="total">Deuda Total: $${deuda.deudaTotal.toLocaleString('es-CL')}</p>
            
            <script>window.print();</script>
        </body>
        </html>
    `);
    docWindow.document.close();
}
