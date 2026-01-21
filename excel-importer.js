/**
 * Excel Importer for APP Asistencia
 * Handles bulk import of members from Excel files
 * Requires: SheetJS (xlsx.js)
 */

class ExcelImporter {
    constructor() {
        this.loadLibrary();
    }

    async loadLibrary() {
        if (typeof XLSX === 'undefined') {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
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

    async importFromFile(file) {
        await this.loadLibrary();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Leer la primera hoja
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    // Procesar datos
                    const result = this.processData(jsonData);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Error leyendo el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    processData(jsonData) {
        const socias = [];
        const errors = [];

        jsonData.forEach((row, index) => {
            try {
                // Validar campos requeridos
                if (!row['Apellido Paterno'] || !row['Apellido Materno'] || !row['Nombres']) {
                    errors.push({
                        row: index + 2, // +2 porque Excel empieza en 1 y tiene header
                        error: 'Faltan campos obligatorios (Apellido Paterno, Apellido Materno, Nombres)'
                    });
                    return;
                }

                const socia = {
                    rut: this.cleanRUT(row['RUT'] || ''),
                    nombres: String(row['Nombres'] || '').trim(),
                    apellidoPaterno: String(row['Apellido Paterno'] || '').trim(),
                    apellidoMaterno: String(row['Apellido Materno'] || '').trim(),
                    telefono: this.cleanPhone(row['Teléfono'] || row['Telefono'] || ''),
                    // Campos opcionales
                    numReg: String(row['N° REG'] || ''),
                    comuna: String(row['Comuna'] || ''),
                    numRegAnt: String(row['N° REG ANT'] || ''),
                    fechaNacimiento: row['Fecha Nacimiento'] || '',
                    edad: String(row['Edad'] || ''),
                    estadoCivil: String(row['Estado Civil'] || ''),
                    celular: this.cleanPhone(row['Celular'] || row['Teléfono'] || row['Telefono'] || ''),
                    direccion: String(row['Dirección'] || row['Direccion'] || ''),
                    email: String(row['Email'] || ''),
                    rbd: String(row['RBD'] || ''),
                    anoIngresoPae: String(row['Año Ingreso PAE'] || ''),
                    hijosMenores: String(row['Hijos Menores'] || ''),
                    hijosMayores: String(row['Hijos Mayores'] || ''),
                    empresa: String(row['Empresa'] || ''),
                    estado: String(row['Estado'] || 'Activo')
                };

                socias.push(socia);
            } catch (error) {
                errors.push({
                    row: index + 2,
                    error: error.message
                });
            }
        });

        return {
            socias,
            errors,
            total: jsonData.length,
            imported: socias.length,
            failed: errors.length
        };
    }

    cleanRUT(rut) {
        if (!rut) return '';
        // Eliminar puntos y guiones, mantener solo números y K
        return String(rut).replace(/[^\dkK]/g, '');
    }

    cleanPhone(phone) {
        if (!phone) return '';
        // Eliminar todo excepto números y +
        return String(phone).replace(/[^\d+]/g, '');
    }

    async saveToLocalStorage(socias, mode = 'add') {
        const existingSocias = JSON.parse(localStorage.getItem('usuarios') || '[]');

        let finalSocias;
        if (mode === 'replace') {
            finalSocias = socias;
        } else {
            // Modo agregar: evitar duplicados por RUT
            const existingRUTs = new Set(existingSocias.map(s => s.rut).filter(r => r));
            const newSocias = socias.filter(s => !s.rut || !existingRUTs.has(s.rut));
            finalSocias = [...existingSocias, ...newSocias];
        }

        localStorage.setItem('usuarios', JSON.stringify(finalSocias));
        return finalSocias.length;
    }

    generateTemplate() {
        const template = [
            {
                'Apellido Paterno': 'González',
                'Apellido Materno': 'Pérez',
                'Nombres': 'María José',
                'Teléfono': '912345678',
                'RUT': '12345678-9',
                'N° REG': '001',
                'Comuna': 'Santiago',
                'Email': 'maria@example.com',
                'Estado': 'Activo'
            },
            {
                'Apellido Paterno': 'Rodríguez',
                'Apellido Materno': 'Silva',
                'Nombres': 'Ana María',
                'Teléfono': '987654321',
                'RUT': '98765432-1',
                'N° REG': '002',
                'Comuna': 'Providencia',
                'Email': 'ana@example.com',
                'Estado': 'Activo'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Socias');

        XLSX.writeFile(wb, 'Plantilla_Socias_SINTRAMAE.xlsx');
    }
}

// Instancia global
const excelImporter = new ExcelImporter();

// Funciones globales
async function handleExcelImport(file, mode = 'add') {
    try {
        const result = await excelImporter.importFromFile(file);

        // Mostrar resumen
        let message = `Procesadas ${result.total} filas\n`;
        message += `Importadas: ${result.imported}\n`;
        message += `Errores: ${result.failed}`;

        if (result.errors.length > 0) {
            message += '\n\nErrores:\n';
            result.errors.slice(0, 5).forEach(err => {
                message += `Fila ${err.row}: ${err.error}\n`;
            });
            if (result.errors.length > 5) {
                message += `... y ${result.errors.length - 5} errores más`;
            }
        }

        if (result.imported > 0) {
            const total = await excelImporter.saveToLocalStorage(result.socias, mode);
            message += `\n\nTotal de socias en sistema: ${total}`;

            // Recargar tabla
            if (typeof loadSocias === 'function') {
                loadSocias();
            }
        }

        alert(message);
    } catch (error) {
        console.error('Error importando Excel:', error);
        alert('Error al importar el archivo Excel: ' + error.message);
    }
}

function downloadExcelTemplate() {
    excelImporter.generateTemplate();
}

// Event listener para input de archivo
document.addEventListener('DOMContentLoaded', () => {
    const excelInput = document.getElementById('excelFile');
    if (excelInput) {
        excelInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleExcelImport(file);
                e.target.value = ''; // Reset input
            }
        });
    }
});
