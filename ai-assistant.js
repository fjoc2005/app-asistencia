// ===================================
// AI Assistant Module
// Natural Language Processing for Admin Tasks
// ===================================

class AIAssistant {
    constructor() {
        this.conversationHistory = [];
        this.currentContext = null;
        this.awaitingInput = null;
        this.loadHistory();
    }

    // Command patterns for natural language processing
    patterns = {
        greeting: /^(hola|hi|hey|buenos días|buenas tardes|buenas noches)/i,
        count: /(cuántas?|cantidad|total|número).*socias?/i,
        search: /(busca|encuentra|muestra|dame|ver).*socia/i,
        add: /(agrega|añade|crea|nueva?).*socia/i,
        update: /(actualiza|modifica|cambia|edita)/i,
        stats: /(estadísticas?|resumen|informe)/i,
        export: /(exporta|guarda|sincroniza).*(?:drive|sheets|google)/i,
        help: /^(ayuda|help|\?|qué puedes hacer)/i,
        meetings: /(reunión|reuniones|meeting)/i,
        discount: /(descuento|rebaja|convenio)/i,
        report_individual: /(reporte.*individual|ficha.*socia)/i,
        report_group: /(reporte.*(grupal|masivo)|nomina|listado)/i
    };

    // Quick action suggestions
    quickActions = [
        { label: '📅 Crear reunión', command: 'Crear nueva reunión' },
        { label: '➕ Agregar socia', command: 'Agregar nueva socia' },
        { label: '📄 Rep. Individual', command: 'Reporte individual' }
    ];

    // Process user message
    async processMessage(message) {
        const userMessage = {
            type: 'user',
            text: message,
            timestamp: new Date().toISOString()
        };
        this.conversationHistory.push(userMessage);

        // If we're in a guided conversation, handle that first
        if (this.awaitingInput) {
            return await this.handleGuidedInput(message);
        }

        // Otherwise, parse the command
        let response = await this.parseCommand(message);

        const assistantMessage = {
            type: 'assistant',
            text: response,
            timestamp: new Date().toISOString()
        };
        this.conversationHistory.push(assistantMessage);
        this.saveHistory();

        return response;
    }

    // Parse command and generate response
    async parseCommand(message) {
        const msg = message.trim();

        // Greeting
        if (this.patterns.greeting.test(msg)) {
            return '¡Hola! 👋 Soy tu asistente de IA. Puedo ayudarte a gestionar socias, buscar información, crear reuniones y exportar datos a Google Drive. ¿En qué puedo ayudarte?';
        }

        // Help
        if (this.patterns.help.test(msg)) {
            return this.getHelpMessage();
        }

        // Count socias
        if (this.patterns.count.test(msg)) {
            return this.countSocias();
        }

        // Search socia
        if (this.patterns.search.test(msg)) {
            return this.searchSocia(msg);
        }

        // Add socia
        if (this.patterns.add.test(msg)) {
            return this.startAddSociaFlow();
        }

        // Update socia
        if (this.patterns.update.test(msg)) {
            return this.startUpdateSociaFlow();
        }

        // Statistics
        if (this.patterns.stats.test(msg)) {
            return this.getStatistics();
        }

        // Export to Google Drive
        if (this.patterns.export.test(msg)) {
            return await this.exportToGoogleDrive();
        }

        // Discount
        if (this.patterns.discount.test(msg)) {
            return this.handleDiscount();
        }

        // Report Individual
        if (this.patterns.report_individual.test(msg)) {
            return this.handleIndividualReport();
        }

        // Report Group
        if (this.patterns.report_group.test(msg)) {
            return this.handleGroupReport();
        }

        // Meetings
        if (this.patterns.meetings.test(msg)) {
            if (msg.toLowerCase().includes('crea') || msg.toLowerCase().includes('nueva')) {
                return this.startAddMeetingFlow();
            }
            return this.getMeetingsInfo();
        }

        // Default response
        return 'No estoy seguro de cómo ayudarte con eso. Puedo ayudarte a:\n\n' +
            '• Buscar socias\n' +
            '• Agregar nuevas socias\n' +
            '• Actualizar datos de socias\n' +
            '• Ver estadísticas\n' +
            '• Exportar datos a Google Drive\n' +
            '• Gestionar reuniones\n\n' +
            '¿Qué te gustaría hacer?';
    }

    // Count socias
    countSocias() {
        const socias = getSocias();
        const activas = socias.filter(s => s.estado === 'Activo').length;
        const inactivas = socias.filter(s => s.estado === 'Inactivo').length;

        return `📊 **Resumen de Socias:**\n\n` +
            `• Total: **${socias.length}** socias\n` +
            `• Activas: **${activas}**\n` +
            `• Inactivas: **${inactivas}**\n\n` +
            `¿Necesitas más información?`;
    }

    // Search socia
    searchSocia(message) {
        const socias = getSocias();

        // Extract search term (remove command words)
        const searchTerm = message
            .replace(/(busca|encuentra|muestra|dame|ver|socia)/gi, '')
            .trim()
            .toLowerCase();

        if (!searchTerm) {
            return 'Por favor dime el nombre o RUT de la socia que buscas. Por ejemplo: "Busca a María González"';
        }

        // Search by name or RUT
        const results = socias.filter(s => {
            const fullName = `${s.nombres || ''} ${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.toLowerCase();
            const rut = (s.rut || '').toLowerCase();
            return fullName.includes(searchTerm) || rut.includes(searchTerm);
        });

        if (results.length === 0) {
            return `❌ No encontré ninguna socia con "${searchTerm}". ¿Quieres buscar otra persona?`;
        }

        if (results.length === 1) {
            const s = results[0];
            const fullName = `${s.nombres || ''} ${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.trim();
            return `✅ **Ficha de Socia:**\n\n` +
                `**${fullName}**\n` +
                `• N° REG: ${s.numReg || '-'}\n` +
                `• RUT: ${s.rut}\n` +
                `• Comuna: ${s.comuna || '-'}\n` +
                `• N° REG ANT: ${s.numRegAnt || '-'}\n` +
                `• F. Nacimiento: ${s.fechaNacimiento || '-'}\n` +
                `• Edad: ${s.edad || '-'}\n` +
                `• Est. Civil: ${s.estadoCivil || '-'}\n` +
                `• Celular: ${s.celular || '-'}\n` +
                `• Dirección: ${s.direccion || '-'}\n` +
                `• Email: ${s.email}\n` +
                `• RBD: ${s.rbd || '-'}\n` +
                `• Año PAE: ${s.anoIngresoPae || '-'}\n` +
                `• Hijos: Menores (${s.hijosMenores || '0'}), Mayores (${s.hijosMayores || '0'})\n` +
                `• Empresa: ${s.empresa || '-'}\n` +
                `• Estado: ${s.estado}\n\n` +
                `¿Deseas actualizar algún dato?`;
        }

        // Multiple results
        let response = `🔍 Encontré **${results.length}** socias:\n\n`;
        results.slice(0, 5).forEach((s, i) => {
            const fullName = `${s.nombres || ''} ${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.trim();
            response += `${i + 1}. **${fullName}** (${s.rut}) - ${s.estado}\n`;
        });

        if (results.length > 5) {
            response += `\n...y ${results.length - 5} más.`;
        }

        return response + '\n\n¿Cuál te interesa?';
    }

    // Start add socia flow
    startAddSociaFlow() {
        this.currentContext = {
            action: 'addSocia',
            data: {},
            step: 'rut'
        };
        this.awaitingInput = 'rut';
        return '✨ Perfecto, vamos a agregar una nueva socia.\n\n¿Cuál es el **RUT**? (Ejemplo: 12.345.678-9)';
    }

    // Start update socia flow
    startUpdateSociaFlow() {
        this.currentContext = {
            action: 'updateSocia',
            data: {},
            step: 'findRut'
        };
        this.awaitingInput = 'findRut';
        return '✏️ Perfecto, vamos a actualizar los datos de una socia.\n\n¿Cuál es el **RUT** de la socia que quieres actualizar? (Ejemplo: 12.345.678-9)';
    }

    // Handle guided input for adding/updating socia
    async handleGuidedInput(input) {
        const context = this.currentContext;

        // Handle update socia flow
        if (context.action === 'updateSocia') {
            return await this.handleUpdateSociaInput(input);
        }

        // Handle add flows
        switch (context.step) {
            case 'rut':
                if (!validateRUT(input)) return '❌ RUT inválido. Ingresa uno como 12.345.678-9';
                if (getSocias().find(s => cleanRUT(s.rut) === cleanRUT(input))) {
                    this.resetContext();
                    return '❌ Este RUT ya existe. ¿Deseas buscarla o actualizarla?';
                }
                context.data.rut = formatRUT(input);
                context.step = 'numReg';
                this.awaitingInput = 'numReg';
                return `✅ RUT: ${context.data.rut}\n\n¿Cuál es el **N° de REG**?`;

            case 'numReg':
                context.data.numReg = input.trim();
                context.step = 'nombres';
                this.awaitingInput = 'nombres';
                return '✅ Registrado.\n\n¿Cuáles son los **nombres**?';

            case 'nombres':
                context.data.nombres = input.trim();
                context.step = 'apellidoPaterno';
                this.awaitingInput = 'apellidoPaterno';
                return '✅ Bien.\n\n¿Cuál es el **apellido paterno**?';

            case 'apellidoPaterno':
                context.data.apellidoPaterno = input.trim();
                context.step = 'apellidoMaterno';
                this.awaitingInput = 'apellidoMaterno';
                return '✅ Ok.\n\n¿Cuál es el **apellido materno**?';

            case 'apellidoMaterno':
                context.data.apellidoMaterno = input.trim();
                context.step = 'comuna';
                this.awaitingInput = 'comuna';
                return '✅ Entendido.\n\n¿En qué **comuna** reside?';

            case 'comuna':
                context.data.comuna = input.trim();
                context.step = 'numRegAnt';
                this.awaitingInput = 'numRegAnt';
                return '✅ Registrada.\n\n¿Tiene un **N° de REG ANT**? (Escribe "no" si no tiene)';

            case 'numRegAnt':
                context.data.numRegAnt = input.toLowerCase() === 'no' ? '' : input.trim();
                context.step = 'fechaNacimiento';
                this.awaitingInput = 'fechaNacimiento';
                return '✅ Guardado.\n\n¿Cuál es su **fecha de nacimiento**? (AAAA-MM-DD)';

            case 'fechaNacimiento':
                context.data.fechaNacimiento = input.trim();
                context.step = 'edad';
                this.awaitingInput = 'edad';
                return '✅ Ok.\n\n¿Qué **edad** tiene?';

            case 'edad':
                context.data.edad = input.trim();
                context.step = 'estadoCivil';
                this.awaitingInput = 'estadoCivil';
                return '✅ Bien.\n\n¿Su **estado civil**? (Soltera, Casada, etc.)';

            case 'estadoCivil':
                context.data.estadoCivil = input.trim();
                context.step = 'celular';
                this.awaitingInput = 'celular';
                return '✅ Ok.\n\n¿Cuál es su **número de celular**?';

            case 'celular':
                context.data.celular = input.trim();
                context.step = 'direccion';
                this.awaitingInput = 'direccion';
                return '✅ Guardado.\n\n¿Cuál es su **dirección**?';

            case 'direccion':
                context.data.direccion = input.trim();
                context.step = 'email';
                this.awaitingInput = 'email';
                return '✅ Entendido.\n\n¿Cuál es su **correo electrónico**?';

            case 'email':
                if (!input.includes('@')) return '❌ Email inválido.';
                context.data.email = input.trim();
                context.step = 'rbd';
                this.awaitingInput = 'rbd';
                return '✅ Ok.\n\n¿Cuál es el **RBD** del establecimiento?';

            case 'rbd':
                context.data.rbd = input.trim();
                context.step = 'anoIngresoPae';
                this.awaitingInput = 'anoIngresoPae';
                return '✅ Registrado.\n\n¿En qué **año ingresó al PAE**?';

            case 'anoIngresoPae':
                context.data.anoIngresoPae = input.trim();
                context.step = 'hijosMenores';
                this.awaitingInput = 'hijosMenores';
                return '✅ Bien.\n\n¿Cuántos **hijos menores** tiene?';

            case 'hijosMenores':
                context.data.hijosMenores = input.trim();
                context.step = 'hijosMayores';
                this.awaitingInput = 'hijosMayores';
                return '✅ Ok.\n\n¿Y cuántos **hijos mayores**?';

            case 'hijosMayores':
                context.data.hijosMayores = input.trim();
                context.step = 'empresa';
                this.awaitingInput = 'empresa';
                return '✅ Entendido.\n\n¿En qué **empresa** trabaja?';

            case 'empresa':
                context.data.empresa = input.trim();
                context.data.estado = 'Activo';
                context.data.fechaRegistro = new Date().toLocaleDateString('es-CL');

                saveSocia(context.data);
                if (typeof loadSocias === 'function') loadSocias();
                if (typeof initializeDashboard === 'function') initializeDashboard();

                this.resetContext();
                return `✅ **¡Socia registrada exitosamente!**\n\nSe ha creado la ficha completa para **${context.data.nombres} ${context.data.apellidoPaterno}**. ¿Necesitas algo más?`;

            case 'meeting_name':
                context.data.nombre = input.trim();
                context.step = 'meeting_date';
                this.awaitingInput = 'meeting_date';
                return '✅ Nombre: ' + context.data.nombre + '\n\n¿Para qué **fecha** es la reunión? (Ejemplo: 2024-05-20)';

            case 'meeting_date':
                context.data.fecha = input.trim();
                context.step = 'meeting_time';
                this.awaitingInput = 'meeting_time';
                return '✅ Fecha: ' + context.data.fecha + '\n\n¿A qué **hora**? (Ejemplo: 18:30)';

            case 'meeting_time':
                context.data.hora = input.trim();
                context.data.id = Date.now().toString();
                context.data.estado = 'Activa';
                context.data.habilitada = true;

                const mtngs = getMeetings();
                mtngs.push(context.data);
                localStorage.setItem('meetings', JSON.stringify(mtngs));

                if (typeof loadMeetings === 'function') loadMeetings();
                if (typeof initializeDashboard === 'function') initializeDashboard();

                this.resetContext();
                return `✅ **¡Reunión creada exitosamente!**\n\n**${context.data.nombre}**\n• Fecha: ${context.data.fecha}\n• Hora: ${context.data.hora}\n\nYa puedes verla en el calendario. ¿Algo más?`;
        }
    }

    // Get statistics
    getStatistics() {
        const socias = getSocias();
        const meetings = getMeetings();
        const asistencias = getAsistencias();
        const today = new Date().toLocaleDateString('es-CL');

        const activeSocias = socias.filter(s => s.estado === 'Activo').length;
        const activeMeetings = meetings.filter(m => m.habilitada !== false).length;
        const todayAttendance = asistencias.filter(a => a.fecha === today).length;

        return `📊 **Estadísticas del Sistema:**\n\n` +
            `**Socias:**\n` +
            `• Total: ${socias.length}\n` +
            `• Activas: ${activeSocias}\n\n` +
            `**Reuniones:**\n` +
            `• Total: ${meetings.length}\n` +
            `• Activas: ${activeMeetings}\n\n` +
            `**Asistencias:**\n` +
            `• Hoy: ${todayAttendance}\n\n` +
            `¿Quieres ver más detalles?`;
    }

    // Export to Google Drive
    async exportToGoogleDrive() {
        if (!driveIntegration) return '❌ La integración no está disponible.';
        if (!driveIntegration.isSignedIn) return '❌ No estás conectado a Google Drive.';

        try {
            await driveIntegration.exportSociasToSheets();
            return '✅ **¡Exportación exitosa!**\n\nEncuentra el archivo en tu carpeta de Google Drive.';
        } catch (error) {
            return '❌ Error al exportar.';
        }
    }

    // Get meetings info
    getMeetingsInfo() {
        const meetings = getMeetings();
        if (meetings.length === 0) return '📅 No hay reuniones registradas. ¿Quieres crear una?';

        const active = meetings.filter(m => m.habilitada !== false);
        let response = `📅 **Reuniones:**\n\n• Total: ${meetings.length}\n• Activas: ${active.length}\n\n`;
        if (active.length > 0) {
            response += '**Próximas:**\n';
            active.slice(0, 3).forEach(m => {
                response += `• ${m.nombre} - ${m.fecha} ${m.hora}\n`;
            });
        }
        return response + '\n¿Necesitas más información?';
    }

    // Help
    getHelpMessage() {
        return '🤖 **¿Cómo puedo ayudarte?**\n\n' +
            '**📋 Gestión de Socias:**\n' +
            '• "Busca a María González"\n' +
            '• "Agrega una nueva socia"\n\n' +
            '**📅 Reuniones:**\n' +
            '• "Crea una reunión"\n' +
            '• "Ver mis reuniones"\n\n' +
            '**📊 Información:**\n' +
            '• "Dame estadísticas"\n' +
            '• "Exporta a Google Sheets"\n\n' +
            '¿Qué te gustaría hacer?';
    }

    // Update socia input
    async handleUpdateSociaInput(input) {
        const context = this.currentContext;

        switch (context.step) {
            case 'findRut':
                if (!validateRUT(input)) return '❌ RUT no válido.';
                const socias = getSocias();
                const socia = socias.find(s => cleanRUT(s.rut) === cleanRUT(input));
                if (!socia) return '❌ No encontré esa socia.';

                context.data = { ...socia };
                context.step = 'selectField';
                this.awaitingInput = 'selectField';
                return `✅ **Encontré a: ${socia.nombres}**\n\n¿Qué campo quieres actualizar? (nombres, email, estado, banco, etc.)`;

            case 'selectField':
                const field = input.trim().toLowerCase();
                const validFields = {
                    'numreg': 'numReg', 'rut': 'rut', 'nombres': 'nombres', 'apellidopaterno': 'apellidoPaterno',
                    'apellidomaterno': 'apellidoMaterno', 'comuna': 'comuna', 'numregant': 'numRegAnt',
                    'fechanacimiento': 'fechaNacimiento', 'edad': 'edad', 'estadocivil': 'estadoCivil',
                    'celular': 'celular', 'direccion': 'direccion', 'email': 'email', 'rbd': 'rbd',
                    'anoingresopae': 'anoIngresoPae', 'hijosmenores': 'hijosMenores', 'hijosmayores': 'hijosMayores',
                    'empresa': 'empresa', 'estado': 'estado'
                };

                if (field === 'cancelar') { this.resetContext(); return '❌ Cancelado.'; }
                if (!validFields[field.replace(/ /g, '')]) return `❌ Campo "${field}" no reconocido. Elige uno de la lista.`;

                context.fieldToUpdate = validFields[field.replace(/ /g, '')];
                context.step = 'newValue';
                this.awaitingInput = 'newValue';
                return `✏️ Nuevo valor para **${context.fieldToUpdate}**:`;

            case 'newValue':
                const newValue = input.trim();
                const fieldKey = context.fieldToUpdate;
                context.data[fieldKey] = newValue;

                const allSocias = getSocias();
                const idx = allSocias.findIndex(s => cleanRUT(s.rut) === cleanRUT(context.data.rut));
                if (idx !== -1) {
                    allSocias[idx] = context.data;
                    localStorage.setItem('usuarios', JSON.stringify(allSocias));
                }
                this.resetContext();
                return '✅ ¡Datos actualizados!';
        }
    }

    resetContext() { this.currentContext = null; this.awaitingInput = null; }
    saveHistory() {
        if (this.conversationHistory.length > 50) this.conversationHistory = this.conversationHistory.slice(-50);
        localStorage.setItem('aiAssistantHistory', JSON.stringify(this.conversationHistory));
    }
    loadHistory() {
        const history = localStorage.getItem('aiAssistantHistory');
        if (history) this.conversationHistory = JSON.parse(history);
    }
    clearHistory() { this.conversationHistory = []; localStorage.removeItem('aiAssistantHistory'); }
    getHistory() { return this.conversationHistory; }
    getQuickActions() { return this.quickActions; }

    // Navigation handlers
    handleDiscount() { showView('descuentos'); return 'Sección de **Descuentos**.'; }
    handleIndividualReport() { showView('reportes'); return 'Sección de **Reportes**.'; }
    handleGroupReport() { showView('reportes'); return 'Sección de **Reportes**.'; }

    // Proactive features
    startAddMeetingFlow() {
        this.currentContext = { action: 'addMeeting', data: {}, step: 'meeting_name' };
        this.awaitingInput = 'meeting_name';
        return '📅 ¡Genial! ¿Qué **nombre** tendrá la reunión?';
    }

    triggerGreeting() {
        const bubble = document.getElementById('ai-reminder-bubble');
        if (bubble) {
            bubble.style.display = 'block';
            setTimeout(() => { bubble.style.opacity = '1'; this.checkReminders(); }, 1000);
        }
    }

    checkReminders() {
        // Target the message element specifically to preserve Avatar/Close button
        const messageEl = document.querySelector('#ai-reminder-bubble .ai-bubble-message');
        const titleEl = document.querySelector('#ai-reminder-bubble .ai-bubble-title');

        if (!messageEl) return;

        const mtgs = getMeetings();
        const today = new Date().toISOString().split('T')[0];
        const mtgToday = mtgs.find(m => m.fecha === today);

        if (titleEl) titleEl.textContent = '¡Hola!';

        if (mtgToday) {
            messageEl.innerHTML = `Tienes la reunión <strong>"${mtgToday.nombre}"</strong> hoy.`;
        } else {
            messageEl.textContent = '¿Cómo puedo ayudarte hoy?';
        }
    }
}

// Global instance
let aiAssistant = null;

// Initialize on page load
if (document.querySelector('.admin-page')) {
    aiAssistant = new AIAssistant();
    // Auto-greeting after a delay
    setTimeout(() => { if (aiAssistant) aiAssistant.triggerGreeting(); }, 2000);
}
