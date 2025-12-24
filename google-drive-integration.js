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
        'https://sheets.googleapis.com/$discovery/rest?version=v4'
    ],
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
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
        } else {
            this.accessToken = null;
            this.clearState();
            this.updateUI();
        }
    }

    // Sign in to Google
    async signIn() {
        try {
            await gapi.auth2.getAuthInstance().signIn();
            // After successful sign-in, create folder structure
            await this.createFolderStructure();
        } catch (error) {
            console.error('Error signing in:', error);
            alert('Error al conectar con Google Drive. Por favor intenta nuevamente.');
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
            const headers = ['RUT', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Email', 'Estado', 'Banco', 'Cuenta', 'Talla', 'Zapatos'];
            const rows = socias.map(s => [
                s.rut,
                s.nombres || '',
                s.apellidoPaterno || '',
                s.apellidoMaterno || '',
                s.email,
                s.estado,
                s.banco || '',
                s.cuenta || '',
                s.talla || '',
                s.zapatos || ''
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
