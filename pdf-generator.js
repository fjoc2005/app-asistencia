/**
 * PDF Generator for APP Asistencia
 * Generates attendance reports in PDF format
 * Requires: jsPDF and jsPDF-AutoTable
 */

class PDFGenerator {
    constructor() {
        this.loadLibraries();
    }

    async loadLibraries() {
        // Load jsPDF if not already loaded
        if (typeof jsPDF === 'undefined') {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }

        // Load jsPDF-AutoTable if not already loaded
        if (typeof jsPDF !== 'undefined' && !jsPDF.jsPDF.API.autoTable) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async generateAttendanceReport(meeting) {
        await this.loadLibraries();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Obtener datos
        const socias = JSON.parse(localStorage.getItem('usuarios') || '[]');
        const asistencias = JSON.parse(localStorage.getItem('asistencias') || '[]');

        // Filtrar asistencias de esta reunión
        const meetingAttendances = asistencias.filter(a => a.meetingId === meeting.id);

        // Clasificar socias
        const asistieron = [];
        const noAsistieron = [];
        const justificaron = [];

        socias.forEach(socia => {
            const attendance = meetingAttendances.find(a => a.rut === socia.rut);

            if (attendance) {
                if (attendance.estado === 'justifico') {
                    justificaron.push({
                        nombre: `${socia.nombres} ${socia.apellidoPaterno} ${socia.apellidoMaterno}`,
                        rut: socia.rut,
                        motivo: attendance.justificacion || 'Sin motivo'
                    });
                } else {
                    asistieron.push({
                        nombre: `${socia.nombres} ${socia.apellidoPaterno} ${socia.apellidoMaterno}`,
                        rut: socia.rut
                    });
                }
            } else {
                noAsistieron.push({
                    nombre: `${socia.nombres} ${socia.apellidoPaterno} ${socia.apellidoMaterno}`,
                    rut: socia.rut
                });
            }
        });

        // Calcular porcentaje
        const totalSocias = socias.length;
        const totalAsistieron = asistieron.length;
        const porcentaje = totalSocias > 0 ? ((totalAsistieron / totalSocias) * 100).toFixed(1) : 0;

        // Configurar documento
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Encabezado
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('REPORTE DE ASISTENCIA', pageWidth / 2, yPos, { align: 'center' });

        yPos += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('SINTRAMAE', pageWidth / 2, yPos, { align: 'center' });

        yPos += 15;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Reunión: ${meeting.nombre}`, 20, yPos);

        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.text(`Fecha: ${this.formatDate(meeting.fecha)}`, 20, yPos);

        yPos += 7;
        doc.text(`Hora: ${meeting.hora}`, 20, yPos);

        yPos += 7;
        doc.text(`Generado: ${this.formatDateTime(new Date())}`, 20, yPos);

        yPos += 15;

        // Resumen
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('RESUMEN', 20, yPos);

        yPos += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Socias: ${totalSocias}`, 20, yPos);

        yPos += 7;
        doc.text(`Asistieron: ${asistieron.length}`, 20, yPos);

        yPos += 7;
        doc.text(`No Asistieron: ${noAsistieron.length}`, 20, yPos);

        yPos += 7;
        doc.text(`Justificaron: ${justificaron.length}`, 20, yPos);

        yPos += 7;
        doc.setFont(undefined, 'bold');
        doc.text(`Porcentaje de Asistencia: ${porcentaje}%`, 20, yPos);

        yPos += 15;

        // Tabla de asistentes
        if (asistieron.length > 0) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`ASISTENTES (${asistieron.length})`, 20, yPos);
            yPos += 5;

            doc.autoTable({
                startY: yPos,
                head: [['N°', 'RUT', 'Nombre']],
                body: asistieron.map((s, i) => [i + 1, s.rut, s.nombre]),
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] },
                margin: { left: 20, right: 20 }
            });

            yPos = doc.lastAutoTable.finalY + 10;
        }

        // Tabla de inasistentes
        if (noAsistieron.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`INASISTENTES (${noAsistieron.length})`, 20, yPos);
            yPos += 5;

            doc.autoTable({
                startY: yPos,
                head: [['N°', 'RUT', 'Nombre']],
                body: noAsistieron.map((s, i) => [i + 1, s.rut, s.nombre]),
                theme: 'grid',
                headStyles: { fillColor: [239, 68, 68] },
                margin: { left: 20, right: 20 }
            });

            yPos = doc.lastAutoTable.finalY + 10;
        }

        // Tabla de justificadas
        if (justificaron.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`JUSTIFICADAS (${justificaron.length})`, 20, yPos);
            yPos += 5;

            doc.autoTable({
                startY: yPos,
                head: [['N°', 'RUT', 'Nombre', 'Motivo']],
                body: justificaron.map((s, i) => [i + 1, s.rut, s.nombre, s.motivo]),
                theme: 'grid',
                headStyles: { fillColor: [245, 158, 11] },
                margin: { left: 20, right: 20 }
            });
        }

        // Guardar PDF
        const fileName = `Reporte_${meeting.nombre.replace(/\s+/g, '_')}_${this.formatDateForFilename(meeting.fecha)}.pdf`;
        doc.save(fileName);

        return fileName;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatDateTime(date) {
        return date.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateForFilename(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
}

// Instancia global
const pdfGenerator = new PDFGenerator();

// Función global para generar reporte
async function generateMeetingReport(meetingId) {
    try {
        const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
        const meeting = meetings.find(m => m.id === meetingId);

        if (!meeting) {
            alert('Reunión no encontrada');
            return;
        }

        const fileName = await pdfGenerator.generateAttendanceReport(meeting);

        // Mostrar mensaje de éxito
        if (typeof showMessage === 'function') {
            showMessage(`Reporte generado: ${fileName}`, 'success');
        } else {
            alert(`Reporte generado exitosamente: ${fileName}`);
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        alert('Error al generar el reporte PDF');
    }
}
