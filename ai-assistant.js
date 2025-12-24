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
        stats: /(estadísticas?|resumen|reporte|informe)/i,
        export: /(exporta|guarda|sincroniza).*(?:drive|sheets|google)/i,
        help: /^(ayuda|help|\?|qué puedes hacer)/i,
        meetings: /(reunión|reuniones|meeting)/i
    };

    // Quick action suggestions
    quickActions = [
        { label: '🔍 Buscar', command: 'Busca una socia' },
        { label: '➕ Agregar', command: 'Agrega una nueva socia' },
        { label: '📊 Estadísticas', command: '¿Cuántas socias tenemos?' },
        { label: '☁️ Exportar', command: 'Exporta a Google Sheets' }
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

        // Meetings
        if (this.patterns.meetings.test(msg)) {
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
            return `✅ **Encontré a:**\n\n` +
                `**${fullName}**\n` +
                `• RUT: ${s.rut}\n` +
                `• Email: ${s.email}\n` +
                `• Estado: ${s.estado}\n` +
                `• Banco: ${s.banco || 'No especificado'}\n` +
                `• Talla: ${s.talla || 'No especificada'}\n\n` +
                `¿Necesitas algo más?`;
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

        // Handle add socia flow
        switch (context.step) {
            case 'rut':
                if (!validateRUT(input)) {
                    return '❌ El RUT no es válido. Por favor ingresa un RUT válido (Ejemplo: 12.345.678-9)';
                }

                // Check if RUT already exists
                const socias = getSocias();
                if (socias.find(s => cleanRUT(s.rut) === cleanRUT(input))) {
                    this.resetContext();
                    return '❌ Este RUT ya está registrado. ¿Quieres buscar a esta socia o hacer otra cosa?';
                }

                context.data.rut = formatRUT(input);
                context.step = 'nombres';
                this.awaitingInput = 'nombres';
                return `✅ RUT: ${formatRUT(input)}\n\nAhora, ¿cuáles son los **nombres**?`;

            case 'nombres':
                if (!input.trim()) {
                    return '❌ Por favor ingresa los nombres.';
                }
                context.data.nombres = input.trim();
                context.step = 'apellidoPaterno';
                this.awaitingInput = 'apellidoPaterno';
                return '✅ Perfecto.\n\n¿Cuál es el **apellido paterno**?';

            case 'apellidoPaterno':
                if (!input.trim()) {
                    return '❌ Por favor ingresa el apellido paterno.';
                }
                context.data.apellidoPaterno = input.trim();
                context.step = 'apellidoMaterno';
                this.awaitingInput = 'apellidoMaterno';
                return '✅ Bien.\n\n¿Cuál es el **apellido materno**?';

            case 'apellidoMaterno':
                if (!input.trim()) {
                    return '❌ Por favor ingresa el apellido materno.';
                }
                context.data.apellidoMaterno = input.trim();
                context.step = 'email';
                this.awaitingInput = 'email';
                return '✅ Excelente.\n\n¿Cuál es el **email**?';

            case 'email':
                if (!input.includes('@')) {
                    return '❌ Por favor ingresa un email válido.';
                }
                context.data.email = input.trim();
                context.data.estado = 'Activo';
                context.data.fechaRegistro = new Date().toLocaleDateString('es-CL');

                // Save socia
                saveSocia(context.data);
                loadSocias();
                loadAttendanceMatrix();
                initializeDashboard();

                const fullName = `${context.data.nombres} ${context.data.apellidoPaterno} ${context.data.apellidoMaterno}`;
                this.resetContext();

                return `✅ **¡Socia agregada exitosamente!**\n\n` +
                    `**${fullName}**\n` +
                    `• RUT: ${context.data.rut}\n` +
                    `• Email: ${context.data.email}\n\n` +
                    `La socia ha sido registrada en el sistema. ¿Necesitas algo más?`;
        }
    }

    // Get statistics
    getStatistics() {
        const socias = getSocias();
        const meetings = getMeetings();
        const asistencias = getAsistencias();
        const today = new Date().toLocaleDateString('es-CL');

        const activeSocias = socias.filter(s => s.estado === 'Activo').length;
        const activeMeetings = meetings.filter(m => m.estado === 'Activa').length;
        const todayAttendance = asistencias.filter(a => a.fecha === today).length;

        return `📊 **Estadísticas del Sistema:**\n\n` +
            `**Socias:**\n` +
            `• Total: ${socias.length}\n` +
            `• Activas: ${activeSocias}\n\n` +
            `**Reuniones:**\n` +
            `• Total: ${meetings.length}\n` +
            `• Activas: ${activeMeetings}\n\n` +
            `**Asistencias:**\n` +
            `• Hoy: ${todayAttendance}\n` +
            `• Total registradas: ${asistencias.length}\n\n` +
            `¿Quieres ver más detalles?`;
    }

    // Export to Google Drive
    async exportToGoogleDrive() {
        if (!driveIntegration) {
            return '❌ La integración con Google Drive no está disponible. Por favor recarga la página.';
        }

        const status = driveIntegration.getStatus();
        if (!status.isConnected) {
            return '❌ No estás conectado a Google Drive.\n\nPor favor ve a la sección "Vinculación de Cuentas" y conecta tu cuenta de Google primero.';
        }

        try {
            await driveIntegration.exportSociasToSheets();
            return '✅ **¡Exportación exitosa!**\n\nLas socias han sido exportadas a Google Sheets. Puedes encontrar el archivo en tu carpeta "Control y Gestión de Asistencia APP" en Google Drive.';
        } catch (error) {
            return '❌ Hubo un error al exportar a Google Drive. Por favor intenta nuevamente.';
        }
    }

    // Get meetings info
    getMeetingsInfo() {
        const meetings = getMeetings();

        if (meetings.length === 0) {
            return '📅 No hay reuniones registradas.\n\n¿Quieres crear una nueva reunión?';
        }

        const active = meetings.filter(m => m.estado === 'Activa');
        let response = `📅 **Reuniones:**\n\n`;
        response += `• Total: ${meetings.length}\n`;
        response += `• Activas: ${active.length}\n\n`;

        if (active.length > 0) {
            response += '**Próximas reuniones:**\n';
            active.slice(0, 3).forEach(m => {
                response += `• ${m.nombre} - ${m.fecha} ${m.hora}\n`;
            });
        }

        return response + '\n¿Necesitas más información?';
    }

    // Get help message
    getHelpMessage() {
        return '🤖 **¿Cómo puedo ayudarte?**\n\n' +
            'Puedo realizar las siguientes acciones:\n\n' +
            '**📋 Gestión de Socias:**\n' +
            '• "Busca a María González"\n' +
            '• "Agrega una nueva socia"\n' +
            '• "Actualizar datos"\n' +
            '• "¿Cuántas socias tenemos?"\n\n' +
            '**📊 Información:**\n' +
            '• "Dame estadísticas"\n' +
            '• "¿Cuántas reuniones hay?"\n\n' +
            '**☁️ Google Drive:**\n' +
            '• "Exporta a Google Sheets"\n' +
            '• "Sincroniza con Drive"\n\n' +
            '¿Qué te gustaría hacer?';
    }

    // Handle update socia input
    async handleUpdateSociaInput(input) {
        const context = this.currentContext;

        switch (context.step) {
            case 'findRut':
                if (!validateRUT(input)) {
                    return '❌ El RUT no es válido. Por favor ingresa un RUT válido (Ejemplo: 12.345.678-9)';
                }

                // Find socia
                const socias = getSocias();
                const socia = socias.find(s => cleanRUT(s.rut) === cleanRUT(input));

                if (!socia) {
                    this.resetContext();
                    return '❌ No encontré ninguna socia con ese RUT. ¿Quieres buscar otra o agregar una nueva?';
                }

                // Store socia data
                context.data = { ...socia };
                context.step = 'selectField';
                this.awaitingInput = 'selectField';

                const fullName = `${socia.nombres || ''} ${socia.apellidoPaterno || ''} ${socia.apellidoMaterno || ''}`.trim();
                return `✅ **Encontré a: ${fullName}**\n\n` +
                    `**Datos actuales:**\n` +
                    `• RUT: ${socia.rut}\n` +
                    `• Nombres: ${socia.nombres || 'No especificado'}\n` +
                    `• Apellido Paterno: ${socia.apellidoPaterno || 'No especificado'}\n` +
                    `• Apellido Materno: ${socia.apellidoMaterno || 'No especificado'}\n` +
                    `• Email: ${socia.email || 'No especificado'}\n` +
                    `• Estado: ${socia.estado || 'No especificado'}\n` +
                    `• Banco: ${socia.banco || 'No especificado'}\n` +
                    `• Cuenta: ${socia.cuenta || 'No especificado'}\n` +
                    `• Talla: ${socia.talla || 'No especificado'}\n` +
                    `• Zapatos: ${socia.zapatos || 'No especificado'}\n\n` +
                    `¿Qué campo quieres actualizar? Escribe:\n` +
                    `• **nombres** - para cambiar los nombres\n` +
                    `• **apellidoPaterno** - para cambiar el apellido paterno\n` +
                    `• **apellidoMaterno** - para cambiar el apellido materno\n` +
                    `• **email** - para cambiar el email\n` +
                    `• **estado** - para cambiar el estado\n` +
                    `• **banco** - para cambiar el banco\n` +
                    `• **cuenta** - para cambiar la cuenta\n` +
                    `• **talla** - para cambiar la talla\n` +
                    `• **zapatos** - para cambiar la talla de zapatos\n` +
                    `• **cancelar** - para cancelar la actualización`;

            case 'selectField':
                const field = input.trim().toLowerCase();

                if (field === 'cancelar') {
                    this.resetContext();
                    return '❌ Actualización cancelada. ¿Necesitas algo más?';
                }

                const validFields = ['nombres', 'apellidopaterno', 'apellidomaterno', 'email', 'estado', 'banco', 'cuenta', 'talla', 'zapatos'];
                if (!validFields.includes(field)) {
                    return '❌ Campo no válido. Por favor elige uno de los campos listados arriba.';
                }

                context.fieldToUpdate = field;
                context.step = 'newValue';
                this.awaitingInput = 'newValue';

                let fieldLabel = field;
                if (field === 'apellidopaterno') fieldLabel = 'apellido paterno';
                if (field === 'apellidomaterno') fieldLabel = 'apellido materno';

                return `✏️ Perfecto, vamos a actualizar el campo **${fieldLabel}**.\n\n¿Cuál es el nuevo valor?`;

            case 'newValue':
                const newValue = input.trim();

                if (!newValue) {
                    return '❌ El valor no puede estar vacío. Por favor ingresa un valor válido.';
                }

                // Validate email if updating email
                if (context.fieldToUpdate === 'email' && !newValue.includes('@')) {
                    return '❌ Por favor ingresa un email válido.';
                }

                // Validate estado if updating estado
                if (context.fieldToUpdate === 'estado' && !['activo', 'inactivo'].includes(newValue.toLowerCase())) {
                    return '❌ El estado debe ser "Activo" o "Inactivo".';
                }

                // Update the field
                const fieldKey = context.fieldToUpdate === 'apellidopaterno' ? 'apellidoPaterno' :
                    context.fieldToUpdate === 'apellidomaterno' ? 'apellidoMaterno' :
                        context.fieldToUpdate;

                const oldValue = context.data[fieldKey];
                context.data[fieldKey] = context.fieldToUpdate === 'estado' ?
                    (newValue.toLowerCase() === 'activo' ? 'Activo' : 'Inactivo') : newValue;

                // Update in database
                const allSocias = getSocias();
                const index = allSocias.findIndex(s => cleanRUT(s.rut) === cleanRUT(context.data.rut));
                if (index !== -1) {
                    allSocias[index] = context.data;
                    localStorage.setItem('usuarios', JSON.stringify(allSocias));
                    loadSocias();
                    loadAttendanceMatrix();
                    initializeDashboard();
                }

                const sociaFullName = `${context.data.nombres || ''} ${context.data.apellidoPaterno || ''} ${context.data.apellidoMaterno || ''}`.trim();
                this.resetContext();

                return `✅ **¡Datos actualizados exitosamente!**\n\n` +
                    `**${sociaFullName}**\n` +
                    `• Campo: **${fieldKey}**\n` +
                    `• Valor anterior: ${oldValue || 'No especificado'}\n` +
                    `• Valor nuevo: ${context.data[fieldKey]}\n\n` +
                    `Los datos han sido actualizados en el sistema. ¿Necesitas actualizar otro campo o hacer algo más?`;
        }
    }

    // Reset conversation context
    resetContext() {
        this.currentContext = null;
        this.awaitingInput = null;
    }

    // Save conversation history
    saveHistory() {
        // Keep only last 50 messages
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(-50);
        }
        localStorage.setItem('aiAssistantHistory', JSON.stringify(this.conversationHistory));
    }

    // Load conversation history
    loadHistory() {
        const history = localStorage.getItem('aiAssistantHistory');
        if (history) {
            this.conversationHistory = JSON.parse(history);
        }
    }

    // Clear history
    clearHistory() {
        this.conversationHistory = [];
        localStorage.removeItem('aiAssistantHistory');
    }

    // Get conversation history
    getHistory() {
        return this.conversationHistory;
    }

    // Get quick actions
    getQuickActions() {
        return this.quickActions;
    }
}

// Global instance
let aiAssistant = null;

// Initialize on page load
if (document.querySelector('.admin-page')) {
    aiAssistant = new AIAssistant();
}
