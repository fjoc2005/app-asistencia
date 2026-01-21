// ===================================
// Google Drive Integration Module
// OAuth 2.0, Folder Management, Data Sync
// ===================================

// Google API Configuration
const GOOGLE_CONFIG = {
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // Replace with actual client ID
    apiKey: 'YOUR_API_KEY', // Replace with actual API key
    discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        'https://sheets.googleapis.com/$discovery/rest?version=v4',
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
        'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
    ],
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'https://www.googleapis.com/auth/gmail.send'
    ].join(' ')
};

// Main folder name
const MAIN_FOLDER_NAME = 'Control y Gestión de Asistencia APP';

// Google Drive Integration Class
class GoogleDriveIntegration {
    constructor() {
        this.isSignedIn = false;
        this.accessToken = null;
        this.mainFolderId = null;
        this.subfolders = {
            socias: null,
            reuniones: null,
            asistencias: null
        };
        this.loadState();
    }

    // Initialize Google API
    async init() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', async () => {
                try {
                    await gapi.client.init({
                        apiKey: GOOGLE_CONFIG.apiKey,
                        clientId: GOOGLE_CONFIG.clientId,
                        discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
                        scope: GOOGLE_CONFIG.scopes
                    });

                    // Listen for sign-in state changes
                    gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSignInStatus.bind(this));

                    // Handle initial sign-in state
                    this.updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

                    resolve();
                } catch (error) {
                    console.error('Error initializing Google API:', error);
                    reject(error);
                }
            });
        });
    }

    // Update sign-in status
    updateSignInStatus(isSignedIn) {
        this.isSignedIn = isSignedIn;
        if (isSignedIn) {
            this.accessToken = gapi.auth.getToken().access_token;
            this.saveState();
            this.updateUI();
            this.startPolling(15000); // Poll every 15 seconds
        } else {
            this.accessToken = null;
            this.clearState();
            this.updateUI();
            this.stopPolling();
        }
    }

    // Sign in to Google
    async signIn() {
        try {
            const auth = gapi.auth2.getAuthInstance();
            if (!auth) {
                throw new Error("Google Auth not initialized");
            }
            await auth.signIn();
            // After successful sign-in, create folder structure
            await this.createFolderStructure();
        } catch (error) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.show(error, 'Google Drive Sign In');
            } else {
                console.error('Error signing in:', error);
                alert('Error al conectar con Google Drive. Por favor intenta nuevamente.');
            }
        }
    }

    // Sign out from Google
    async signOut() {
        try {
            await gapi.auth2.getAuthInstance().signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    // Create main folder and subfolders
    async createFolderStructure() {
        try {
            // Check if main folder already exists
            const existingFolder = await this.findFolder(MAIN_FOLDER_NAME);

            if (existingFolder) {
                this.mainFolderId = existingFolder.id;
            } else {
                // Create main folder
                const mainFolder = await this.createFolder(MAIN_FOLDER_NAME);
                this.mainFolderId = mainFolder.id;
            }

            // Create subfolders
            this.subfolders.socias = await this.createSubfolder('Socias', this.mainFolderId);
            this.subfolders.reuniones = await this.createSubfolder('Reuniones', this.mainFolderId);
            this.subfolders.asistencias = await this.createSubfolder('Asistencias', this.mainFolderId);

            this.saveState();
            this.updateUI();

            return true;
        } catch (error) {
            console.error('Error creating folder structure:', error);
            return false;
        }
    }

    // Find folder by name
    async findFolder(folderName) {
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            if (response.result.files && response.result.files.length > 0) {
                return response.result.files[0];
            }
            return null;
        } catch (error) {
            console.error('Error finding folder:', error);
            return null;
        }
    }

    // Create folder
    async createFolder(folderName, parentId = null) {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };

        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        try {
            const response = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id, name'
            });
            return response.result;
        } catch (error) {
            console.error('Error creating folder:', error);
            throw error;
        }
    }

    // Create subfolder (checks if exists first)
    async createSubfolder(name, parentId) {
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            if (response.result.files && response.result.files.length > 0) {
                return response.result.files[0].id;
            }

            const folder = await this.createFolder(name, parentId);
            return folder.id;
        } catch (error) {
            console.error('Error creating subfolder:', error);
            return null;
        }
    }

    // Export socias to Google Sheets
    async exportSociasToSheets() {
        if (!this.isSignedIn) {
            alert('Por favor conecta con Google Drive primero.');
            return;
        }

        try {
            const socias = getSocias(); // From admin.js

            if (socias.length === 0) {
                alert('No hay socias para exportar.');
                return;
            }

            // Create spreadsheet
            const spreadsheet = await this.createSpreadsheet('Nómina de Socias', this.subfolders.socias);

            // Prepare data
            const headers = [
                'N° de REG', 'RUT', 'Nombres', 'Apellido Paterno', 'Apellido Materno',
                'Comuna', 'N° REG ANT', 'Fecha de Nacimiento', 'Edad', 'Estado Civil',
                'Número de Celular', 'Dirección', 'Correo Electrónico', 'RBD',
                'Año de Ingreso al PAE', 'Hijos Menores', 'Hijos Mayores', 'Empresa', 'Estado'
            ];
            const rows = socias.map(s => [
                s.numReg || '',
                s.rut,
                s.nombres || '',
                s.apellidoPaterno || '',
                s.apellidoMaterno || '',
                s.comuna || '',
                s.numRegAnt || '',
                s.fechaNacimiento || '',
                s.edad || '',
                s.estadoCivil || '',
                s.celular || '',
                s.direccion || '',
                s.email || '',
                s.rbd || '',
                s.anoIngresoPae || '',
                s.hijosMenores || '0',
                s.hijosMayores || '0',
                s.empresa || '',
                s.estado || 'Activo'
            ]);

            // Write data to sheet
            await this.writeToSheet(spreadsheet.spreadsheetId, 'A1', [headers, ...rows]);

            // Format header row
            await this.formatHeaderRow(spreadsheet.spreadsheetId);

            alert(`¡Exportación exitosa! Archivo creado en Google Drive.`);
            return spreadsheet.spreadsheetUrl;
        } catch (error) {
            console.error('Error exporting to Sheets:', error);
            alert('Error al exportar a Google Sheets. Por favor intenta nuevamente.');
        }
    }

    // Create Google Spreadsheet
    async createSpreadsheet(title, folderId) {
        try {
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: title
                }
            });

            const spreadsheetId = response.result.spreadsheetId;

            // Move to folder
            if (folderId) {
                await gapi.client.drive.files.update({
                    fileId: spreadsheetId,
                    addParents: folderId,
                    fields: 'id, parents'
                });
            }

            return response.result;
        } catch (error) {
            console.error('Error creating spreadsheet:', error);
            throw error;
        }
    }

    // Write data to sheet
    async writeToSheet(spreadsheetId, range, values) {
        try {
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: 'RAW',
                resource: {
                    values: values
                }
            });
        } catch (error) {
            console.error('Error writing to sheet:', error);
            throw error;
        }
    }

    // Format header row
    async formatHeaderRow(spreadsheetId) {
        try {
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                resource: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.26,
                                        green: 0.27,
                                        blue: 0.91
                                    },
                                    textFormat: {
                                        foregroundColor: {
                                            red: 1.0,
                                            green: 1.0,
                                            blue: 1.0
                                        },
                                        fontSize: 11,
                                        bold: true
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    }]
                }
            });
        } catch (error) {
            console.error('Error formatting header:', error);
        }
    }

    // Save state to localStorage
    saveState() {
        const state = {
            isSignedIn: this.isSignedIn,
            mainFolderId: this.mainFolderId,
            subfolders: this.subfolders
        };
        localStorage.setItem('googleDriveState', JSON.stringify(state));
    }

    // Load state from localStorage
    loadState() {
        const state = localStorage.getItem('googleDriveState');
        if (state) {
            const parsed = JSON.parse(state);
            this.mainFolderId = parsed.mainFolderId;
            this.subfolders = parsed.subfolders || { socias: null, reuniones: null, asistencias: null };
        }
    }

    // Clear state
    clearState() {
        this.mainFolderId = null;
        this.subfolders = { socias: null, reuniones: null, asistencias: null };
        localStorage.removeItem('googleDriveState');
    }

    // Update UI based on connection status
    updateUI() {
        const statusCard = document.getElementById('driveStatusCard');
        const connectBtn = document.getElementById('driveConnectBtn');
        const disconnectBtn = document.getElementById('driveDisconnectBtn');
        const syncBtn = document.getElementById('driveSyncBtn');
        const exportBtn = document.getElementById('driveExportBtn');
        const statusIndicator = document.getElementById('driveStatusIndicator');
        const statusText = document.getElementById('driveStatusText');
        const userEmail = document.getElementById('driveUserEmail');
        const folderStatus = document.getElementById('driveFolderStatus');

        if (this.isSignedIn) {
            const user = gapi.auth2.getAuthInstance().currentUser.get();
            const profile = user.getBasicProfile();

            statusIndicator.textContent = '✅';
            statusText.textContent = 'Conectado';
            statusText.className = 'status-text connected';
            userEmail.textContent = profile.getEmail();
            userEmail.style.display = 'block';

            if (this.mainFolderId) {
                folderStatus.textContent = '📁 Carpeta creada';
                folderStatus.style.display = 'block';
            }

            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-flex';
            syncBtn.disabled = false;
            exportBtn.disabled = false;
        } else {
            statusIndicator.textContent = '❌';
            statusText.textContent = 'Desconectado';
            statusText.className = 'status-text disconnected';
            userEmail.style.display = 'none';
            folderStatus.style.display = 'none';

            connectBtn.style.display = 'inline-flex';
            disconnectBtn.style.display = 'none';
            syncBtn.disabled = true;
            exportBtn.disabled = true;
        }
    }

    // Get connection status for AI assistant
    getStatus() {
        return {
            isConnected: this.isSignedIn,
            email: this.isSignedIn ? gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail() : null,
            folderCreated: !!this.mainFolderId
        };
    }

    // Send email using Gmail API
    async sendEmail(to, subject, body) {
        if (!this.isSignedIn) {
            throw new Error('Not signed in to Google');
        }

        const email = [
            `To: ${to}`,
            'Content-Type: text/plain; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${subject}`,
            '',
            body
        ].join('\n');

        const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        try {
            await gapi.client.gmail.users.messages.send({
                'userId': 'me',
                'resource': {
                    'raw': base64EncodedEmail
                }
            });
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Data Persistence Methods
    async saveDataFile(filename, data) {
        if (!this.isSignedIn || !this.mainFolderId) return;

        try {
            // Find existing file in main folder
            const response = await gapi.client.drive.files.list({
                q: `name='${filename}' and '${this.mainFolderId}' in parents and trashed=false`,
                fields: 'files(id, name)'
            });

            const fileId = response.result.files.length > 0 ? response.result.files[0].id : null;
            const content = JSON.stringify(data);
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const contentType = 'application/json';
            const metadata = {
                'name': filename,
                'mimeType': contentType,
                'parents': [this.mainFolderId]
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + contentType + '\r\n\r\n' +
                content +
                close_delim;

            if (fileId) {
                // Update existing file
                await gapi.client.request({
                    'path': `/upload/drive/v3/files/${fileId}`,
                    'method': 'PATCH',
                    'params': { 'uploadType': 'multipart' },
                    'headers': {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody
                });
            } else {
                // Create new file
                await gapi.client.request({
                    'path': '/upload/drive/v3/files',
                    'method': 'POST',
                    'params': { 'uploadType': 'multipart' },
                    'headers': {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody
                });
            }
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);
        }
    }

    async loadDataFile(filename) {
        if (!this.isSignedIn || !this.mainFolderId) return null;

        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${filename}' and '${this.mainFolderId}' in parents and trashed=false`,
                fields: 'files(id, name)'
            });

            if (response.result.files.length === 0) return null;

            const fileId = response.result.files[0].id;
            const fileResponse = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            return fileResponse.result;
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }

    async syncData() {
        if (!this.isSignedIn) return;

        const data = {
            usuarios: getSocias(),
            meetings: getMeetings(),
            attendanceRecords: getAttendanceRecords(),
            discounts: getDiscounts()
        };

        await this.saveDataFile('app_data.json', data);
        console.log('Data synced to Drive');
    }

    async loadAllFromDrive() {
        const data = await this.loadDataFile('app_data.json');
        if (data) {
            // Check timestamps if available ?? for now overwrite local
            if (data.usuarios) localStorage.setItem('usuarios', JSON.stringify(data.usuarios));
            if (data.meetings) localStorage.setItem('meetings', JSON.stringify(data.meetings));
            if (data.attendanceRecords) localStorage.setItem('attendanceRecords', JSON.stringify(data.attendanceRecords));
            if (data.discounts) localStorage.setItem('discounts', JSON.stringify(data.discounts));

            // Trigger UI refresh if in admin
            if (typeof loadSocias === 'function') loadSocias();
            if (typeof renderDashboard === 'function') renderDashboard();

            return true;
        }
        return false;
    }

    // Auto-Sync Features
    startPolling(intervalMs = 30000) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.checkForUpdates(), intervalMs);
        console.log('Started polling for Drive updates');
    }

    stopPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    }

    async checkForUpdates() {
        if (!this.isSignedIn || !this.mainFolderId) return;

        // Simple check: get metadata and compare modifiedTime
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='app_data.json' and '${this.mainFolderId}' in parents and trashed=false`,
                fields: 'files(id, modifiedTime)'
            });

            if (response.result.files.length > 0) {
                const remoteTime = new Date(response.result.files[0].modifiedTime).getTime();
                const lastSync = localStorage.getItem('lastSyncTime');

                // If remote is newer than last sync + buffer, reload
                if (!lastSync || remoteTime > parseInt(lastSync)) {
                    console.log('New data found on Drive, reloading...');
                    await this.loadAllFromDrive();
                    localStorage.setItem('lastSyncTime', Date.now().toString());

                    // Notify user
                    this.showNotification("Datos actualizados desde Drive");
                }
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    showNotification(msg) {
        // Minimal toast notification
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; 
            background: #10B981; color: white; padding: 10px 20px; 
            border-radius: 8px; z-index: 9999; animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Global instance
let driveIntegration = null;

// Initialize on page load
if (document.querySelector('.admin-page')) {
    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
        driveIntegration = new GoogleDriveIntegration();
        driveIntegration.init().catch(error => {
            console.error('Failed to initialize Google Drive:', error);
        });
    };
    document.head.appendChild(script);
}
