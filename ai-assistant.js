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

